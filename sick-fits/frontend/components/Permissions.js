import { Query, Mutation } from 'react-apollo';
import Error from './ErrorMessage';
import gql from 'graphql-tag';
import Table from './styles/Table';
import SickButton from './styles/SickButton';
import PropTypes from 'prop-types';

const possiblePermissions = [
  'ADMIN',
  'USER',
  'ITEMCREATE',
  'ITEMUPDATE',
  'ITEMDELETE',
  'PERMISSIONCREATE'
];

const UPDATE_PERMISSIONS_MUTATION = gql`
  mutation updatePermissions($permissions: [Permission], $userId: ID!) {
    updatePermissions(permissions: $permissions, userId: $userId) {
      id
      permissions
      name
      email
    }
  }
  
`

const ALL_USERS_QUERY = gql`
  query {
    users {
      id
      name
      email
      permissions
    }
  }
`;

const Permissions = props => (
  <Query query={ALL_USERS_QUERY}>
    {({ data, loading, error }) =>
      console.log(data) || (
        <div>
          <Error error={error} />
          <div>
            <h1>Manage Permissions</h1>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  {possiblePermissions.map(perm => (
                    <th key={perm}>{perm}</th>
                  ))}
                  <th>+</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(user => (
                  <UserPermissions user={user} key={user.id} />
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )
    }
  </Query>
);

class UserPermissions extends React.Component {
  static propTypes = {
    user: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
      is: PropTypes.string,
      permissions: PropTypes.array
    }).isRequired
  };

  state = {
    permissions: this.props.user.permissions
  };

  handlePermissionChange = (e) => {
    const checkbox = e.target;
    let updatedPermissions = [...this.state.permissions];
    if(checkbox.checked) {
      updatedPermissions.push(checkbox.value)
    } else {
      updatedPermissions = updatedPermissions.filter(perm => perm !== checkbox.value)
    }
    this.setState({permissions: updatedPermissions})
  }

  render() {
    const user = this.props.user;
    console.log(user)
    return (
      <Mutation mutation={UPDATE_PERMISSIONS_MUTATION}
      variables={{permissions: this.state.permissions, userId: this.props.user.id}}>
      {(updatePermissions, {loading, error}) => (
        <>
        {error && <tr><td colSpan="8"><Error error={error} /></td></tr> }
      <tr>
        <td>{user.name}</td>
        <td>{user.email}</td>
        {possiblePermissions.map(perm => (
          <td key={perm}>
            <label htmlFor={`${user.id}-permission-${perm}`}>
              <input type="checkbox"
              id={`${user.id}-permission-${perm}`} 
              checked={this.state.permissions.includes(perm)}
              value={perm}
              onChange={this.handlePermissionChange}/>
            </label>
          </td>
        ))}
        <td>
          <SickButton 
            type="button"
            disabled={loading}
            onClick={updatePermissions}
          >
            Updat{loading ? 'ing' : 'e'}
          </SickButton>
        </td>
      </tr>
              </>
              )}
              </Mutation>
    );
  }
}

export default Permissions;
