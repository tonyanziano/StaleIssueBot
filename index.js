require('dotenv').config()
const fetch = require('node-fetch');

// lets make a graphql query!
const GH_TOKEN = process.env.GH_TOKEN || '';
const AUTH_HEADER = `bearer ${GH_TOKEN}`;
const GH_ENDPOINT = 'https://api.github.com/graphql';

let options = {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Authorization': AUTH_HEADER,
    'Content-Type': 'application/json'
  },
  body: undefined
};

const body = JSON.stringify({ query: `{ repository(owner:"microsoft", name:"BotFramework-Emulator"){ issues(last:20, states:OPEN) { edges { node { title } } } } }` });
options.body = body;
console.log(options);

// 1. check github for issues with "pending (?)" tag
fetch(GH_ENDPOINT, options).then(r => r.json()).then(json => {
  const edges = json.data.repository.issues.edges;
  edges.forEach(edge => console.log(edge.node));
});

// 2. check last comment to make sure it's one of us

// 3. check how long ago it was posted

// 4. if time was >= 7 days, then close issue and post stale notification