import React from 'react';
import Downshift, { resetIdCounter } from 'downshift'
import Router from 'next/router'
import { ApolloConsumer } from 'react-apollo';
import gql from 'graphql-tag';
import debounce from 'lodash.debounce';
import { DropDown, DropDownItem, SearchStyles } from './styles/DropDown';

const SEARCH_ITEMS_QUERY = gql`
  query SEARCH_ITEMS_QUERY($searchTerm: String!) {
    items(where: {
      OR: [
      {title_contains: $searchTerm},
      {description_contains: $searchTerm}
      ]
    }) {
      id
      image
      title
    }
  }
`;

function routeToItem(item) {
  Router.push({
    pathname: '/item',
    query: {
      id:item.id
    }
  })
}

class AutoComplete extends React.Component {

  state = {
    items: [],
    loading: false,
  }

  onChange = debounce(async (e, client) => {
    this.setState({loading: true})
    //manually query apollo client
    const res = await client.query({
      query: SEARCH_ITEMS_QUERY,
      variables: {searchTerm: e.target.value}
    })

    this.setState({items: res.data.items, loading: false})
  }, 350);

  render () {
    resetIdCounter();
    return (
      <SearchStyles>
        <Downshift 
          itemToString={item => (item === null ? null : item.title)}
          onChange={routeToItem}
          >
          {({getInputProps, getItemProps, isOpen, inputValue, highlightedIndex}) => (
            <div>
              <ApolloConsumer>
                {(client) => (
                  <input {
                    ...getInputProps({
                      placeholder: 'search for an item',
                      id: 'search',
                      className: this.state.loading ? 'loading' : '',
                      type: 'search',
                      onChange: e => { e.persist(); this.onChange(e, client)}}
                    )}  
                  />
                )}
              </ApolloConsumer>
              {isOpen && (
                <DropDown>
                  {
                  this.state.items.map((item, i) => 
                    <DropDownItem
                      {...getItemProps({item})}
                      key={item.id}
                      highlighted={i === highlightedIndex}
                      >
                      <img width={50} src={item.image} alt={item.title} />
                      {item.title}
                    </DropDownItem>
                  )
                }
                {!this.state.items.length && !this.state.loading && (
                  <DropDownItem>Nothing found for {inputValue}</DropDownItem>
                  )
                }
                </DropDown>
              )}
            </div>
          )}
        </Downshift>
      </SearchStyles>
    )
  }
}

export default AutoComplete