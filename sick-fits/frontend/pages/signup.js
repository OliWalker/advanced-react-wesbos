import SignUp from '../components/Signup';
import Signin from '../components/Signin';

import styled from 'styled-components';
import RequestReset from '../components/RequestReset';

const Colums = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-gap: 20px;
`;

const SignUpPage = props => (
  <Colums>
    <SignUp />
    <Signin />
    <RequestReset />
  </Colums>
);

export default SignUpPage;
