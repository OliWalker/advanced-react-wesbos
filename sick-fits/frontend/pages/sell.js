import CreateItem from '../components/CreateItem';
import PleaseSignIn from '../components/PleaseSignIn';

const Sell = props => (
  <div>
    <PleaseSignIn>
      <CreateItem>sell!</CreateItem>
    </PleaseSignIn>
  </div>
);

export default Sell;
