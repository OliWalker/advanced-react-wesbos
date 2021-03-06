import React, { Component } from 'react';
import { Query } from 'react-apollo';
import gql from 'graphql-tag';
import Error from './ErrorMessage'
import { formatDistance } from 'date-fns'
import Link from 'next/link'
import formatMoney from '../lib/formatMoney'
import OrderItemStyles from './styles/OrderItemStyles'
import styled from 'styled-components'
import Order from './Order';

const GET_ORDERS_QUERY = gql`
  query GET_ORDERS_QUERY {
    orders (orderBy: createdAt_DESC) {
      id
      total
      createdAt
      items {
        id
        title
        price
        description
        quantity
        image
      }
    }
  }
`

const OrderUl = styled.ul`
  display: grid;
  grid-gap: 4rem;
  grid-template-colums: repeat(auto-fit, minmax(40%, 1fr));
`

 class Orders extends Component {
  render() {
    return (
      <Query query={GET_ORDERS_QUERY}>
      {({data, loading, error}) =>{
        if (error) return <Error error={error} />
        if (loading) return <p>loading</p>
        console.log(data)
        const { orders } = data;
        return (
          <div>
            <h2>You have {orders.length} orders!</h2>
            <OrderUl>
              {orders.map(order => (
                <OrderItemStyles key={order.id}>
                  <Link href={{
                    pathname: '/order',
                    query: {id: order.id}
                  }}>
                    <a>
                      <div className='order-meta'>
                        <p>{order.items.reduce((a,b) => a+b.quantity, 0)} Items</p>
                        <p>{order.createdAt}</p>
                        <p>{formatMoney(order.total)}</p>
                      </div>
                      <div className='images'>
                        {order.items.map(item => (
                          <img key={item.id} src={item.image} alt={item.title} />
                        ))}
                      </div>
                    </a>
                  </Link>
                </OrderItemStyles>
              ))}
            </OrderUl>
          </div>
        )
      }}
      </Query>
    )
  }
}

export default Orders;
