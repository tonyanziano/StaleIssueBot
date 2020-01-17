const GH_TOKEN = process.env.GH_TOKEN || '';
const AUTH_HEADER = `bearer ${GH_TOKEN}`;
const GH_ENDPOINT = 'https://api.github.com/graphql';
const FETCH_OPTIONS = {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Authorization': AUTH_HEADER,
    'Content-Type': 'application/json'
  },
  body: undefined
};

module.exports = {
  FETCH_OPTIONS,
  GH_ENDPOINT,
};
