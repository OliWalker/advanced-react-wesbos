const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { transport, makeANiceEmail } = require('../mail');
const { hasPermission } = require('../utils')
const stripe = require('../stripe')


const Mutations = {
  async createItem(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that!');
    }

    const item = await ctx.db.mutation.createItem(
      {
        data: {
          // This is how to create a relationship between the Item and the User
          user: {
            connect: {
              id: ctx.request.userId,
            },
          },
          ...args,
        },
      },
      info
    );

    console.log(item);

    return item;
  },

  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    //1 find item
    const item = await ctx.db.query.item({ where }, `{ id title user { id }}`);
    //2 check perms
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPerms = ctx.request.user.permissions.some(perm => ['ADMIN', 'DELETE'].includes(perm))

    if (!ownsItem && !hasPerms) throw new Error('You are not allowed')

    //TODO
    //3 delete it
    return ctx.db.mutation.deleteItem({ where }, info);
  },

  async signup(parent, args, ctx, info) {
    //email to lowercase always
    args.email = args.email.toLowerCase();
    //hash the password
    const password = await bcrypt.hash(args.password, 10);
    //create user in db
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ['USER'] }
        }
      },
      info
    );
    // create JWT for user
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    //set jwt as cookie on the res
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year cookie
    });
    //return user to browser
    return user;
  },

  async signin(parent, { email, password }, ctx, info) {
    //check if there is a user with email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) throw new Error(`No user found for email ${email}`);
    //check if password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error(`invalid password`);
    //generate jwt
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    //set cookie with tokem
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year cookie
    });
    //return user
    return user;
  },

  signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token');
    return { message: 'Goodbye!' };
  },

  async requestReset(parent, args, ctx, info) {
    //check if user
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) throw new Error(`No user found for email ${args.email}`);
    console.log(user);
    //set rest token and expiry
    const randomBytesPromisified = await promisify(randomBytes);
    const resetToken = (await randomBytesPromisified(20)).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000;
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    });
    //email reset token
    console.log('here!', res);
    const mailRes = await transport.sendMail({
      from: 'oli@oli.com',
      to: user.email,
      subject: 'Your Password Reset Token',
      html: makeANiceEmail(
        `Your password reset token is here! \n\n <a href="${
          process.env.FRONTEND_URL
        }/reset?resetToken=${resetToken}">
          Click here to reset!
        </a>`
      )
    });

    console.log('MAIL', mailRes);

    //return message
    return { message: 'Thanks!' };
  },

  async resetPassword(parent, args, ctx, info) {
    //check f passwords match
    if (args.password !== args.confirmPassword)
      throw new Error('Passwords must match!');
    //check if token is correct

    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });

    console.log(user);

    if (!user) throw new Error('This token is invalid or expired');

    //check if expired

    //hash new pass

    const password = await bcrypt.hash(args.password, 10);

    //save new pass to user and remove old reset token

    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    // generate new jwt

    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);

    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    return updatedUser;

    //set as cookie

    //return new user
  },
  async updatePermissions(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in!')
    }
    const currentUser = await ctx.db.query.user({
      where: {
        id: ctx.request.user.id
      },
    info
    })
    console.log("CURRENT USER",currentUser)
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE'])

    return ctx.db.mutation.updateUser({
      data: {
        permissions: {
          set: args.permissions
        }
      },
      where: {
        id: args.userId
      },
    }, info)
  },

  async addToCart(parent, args, ctx, info) {
    //make sure signed in
    const {userId} = ctx.request
    if (!userId) throw new error('must be signed in!')

    //query current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: {id : userId},
        item: {id: args.id},
      }
    })


    //check if item is there and inc
    if (existingCartItem) {
      console.log('alreadyincar');
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 },
        },
        info
      );
    }

    // if not, create new item
    return ctx.db.mutation.createCartItem({
      data: {
        user: {
          connect: {id: userId}
        },
        item: {
          connect: { id: args.id}
        }
      }
    },
    info)
  },

  async removeFromCart (parent, args, ctx, info) {
    //find item
    const cartItem = await ctx.db.query.cartItem({
      where: {
        id: args.id
      }
    }, `{id, user {id}}`)
    // make sure we find it
    if (!cartItem) throw new Error('No Cart Item Found!')
    //check they own it
    if (cartItem.user.id !== ctx.request.userId) {
      throw new Error('Not yours brah')
    }
    return ctx.db.mutation.deleteCartItem({
      where: {
        id: args.id
      }
    }, info)
    //delete that item
  },

  async createOrder (parent, args, ctx, info) {
    //auth user
    const { userId } = ctx.request;
    if(!userId) throw new Error('You must be signed in!')
    const user = await ctx.db.query.user({where: {id: userId}},
      `{ 
        id 
        name 
        email 
        cart {
          id 
          quantity 
          item 
          { 
            title 
            price 
            id
            description 
            image
            largeImage
          }
        }
      }`)
    //recalc total
    const amount = user.cart.reduce((tally, cartItem) => 
      tally + cartItem.item.price * cartItem.quantity, 0)
      console.log("going to charge for    " + amount)

    //create strip charge (turn token to cash)

    const charge = await stripe.charges.create({
      amount,
      currency: 'USD',
      source: args.token,
    })

    console.log(charge)


    //convert cartItems to orderItems

    const orderItems = user.cart.map(cartItem => {
      const orderItem = {
        ...cartItem.item,
        quantity: cartItem.quantity,
        user:{ connect: {id: userId}}
      }
      delete orderItem.id
      return orderItem
    })

    //create Order
    const order = await ctx.db.mutation.createOrder({
      data: {
        total: charge.amount,
        charge: charge.id,
        items: { create: orderItems },
        user: {connect: { id: userId} },
      }
    })
    //clear users cart delete cart item

    const cartItemIds = user.cart.map(cartItem => cartItem.id);
    await ctx.db.mutation.deleteManyCartItems({ 
      where: {
        id_in: cartItemIds
      }
    })

    // return order to client
    return order
  }
};

module.exports = Mutations;
