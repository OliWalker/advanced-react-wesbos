import PleaseSignIn from '../components/PleaseSignIn';
import Orders from '../components/Orders'

const orders = props => (
  <div>
    <PleaseSignIn>
      <Orders />
    </PleaseSignIn>
  </div>
);

export default orders;
