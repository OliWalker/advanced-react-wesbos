import withApollo from 'next-with-apollo';
import ApolloClient from 'apollo-boost';
import { endpoint } from '../config';
import { LOCAL_STATE_QUERY } from '../components/Cart';

function createClient({ headers }) {
  return new ApolloClient({
    uri: process.env.NODE_ENV === 'development' ? endpoint : endpoint,
    request: operation => {
      operation.setContext({
        fetchOptions: {
          credentials: 'include',
        },
        headers,
      });
    },
    //local data
    clientState: {
      resolvers: {
        Mutation:{
          toggleCart(_, variables, {cache}) {
            console.log('called')
            //read value of cart open from cache
            const {cartOpen} = cache.readQuery({
              query: LOCAL_STATE_QUERY,
            })
            console.log(cartOpen);
            const data = {
              data: {cartOpen: !cartOpen}
            };
            console.log(data)
            // set new data to cache
            cache.writeData(data);
            return data;

          },
        },
      },
      defaults: {
        cartOpen: false,
      },
    }
  });
}

export default withApollo(createClient);
