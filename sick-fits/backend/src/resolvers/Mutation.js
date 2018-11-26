const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { transport, makeANiceEmail } = require('../mail');

const Mutations = {
  async createItem(parent, args, ctx, info) {
    //TODO: check if logged in
    const item = await ctx.db.mutation.createItem(
      {
        data: {
          ...args
        }
      },
      info
    );
    return item;
  },

  updateItem(parent, args, ctx, info) {
    //take copy of update
    const updates = { ...args };
    //remove id
    delete updates.id;
    //run update
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info
    );
  },

  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    //1 find item
    const item = await ctx.db.query.item({ where }, `{id, title}`);
    //2 check perms
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
  }
};

module.exports = Mutations;
