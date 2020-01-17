const fetch = require('node-fetch');

const { FETCH_OPTIONS, GH_ENDPOINT } = require('../constants');

function executeQuery(query) {
  const options = {
    ...FETCH_OPTIONS,
    body: JSON.stringify(query),
  };
  return fetch(GH_ENDPOINT, options);
}

module.exports = {
  executeQuery
};
