require('dotenv').config()
const fetch = require('node-fetch');
const { appendFileSync } = require('fs');

// lets make a graphql query!
const GH_TOKEN = process.env.GH_TOKEN || '';
const AUTH_HEADER = `bearer ${GH_TOKEN}`;
const GH_ENDPOINT = 'https://api.github.com/graphql';

// configurable options (will add config capability later)
const REPO_OWNER = 'tonyanziano';
const REPO = 'StaleIssueBot';
const STALE_TIME_THRESHOLD = 1000 * 60; // 10 minutes
const STALE_LABEL = 'pending-update'; // label used to mark an issue for staleness tracking
const STALENESS_COMMENT = `Closing due to inactivity. It\'s been longer than ${STALE_TIME_THRESHOLD} since this post was marked with the ${STALE_LABEL} label. Feel free to re-open the issue.`;

let options = {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Authorization': AUTH_HEADER,
    'Content-Type': 'application/json'
  },
  body: undefined
};

// grabs the id and most recent update time of the last comment in an issue
const lastCommentWithDateQuery = `comments(last:1) { edges { node { id updatedAt } } }`;
// grabs all the issues associated with the staleness label
//const rootQuery = JSON.stringify({ query: `{ repository(owner:"${REPO_OWNER}", name:"${REPO}") { labels(first:1, query:"${STALE_LABEL}") { edges { node { id issues(first:100, labels:"${STALE_LABEL}", states:OPEN) { edges { node { id title ${lastCommentWithDateQuery} } } } } } } }}`})
const rootQuery = JSON.stringify({
  query: 
    `{
      repository(owner:"${REPO_OWNER}", name:"${REPO}") {
        labels(first:1, query:"${STALE_LABEL}") {
          edges {
            node {
              id
            }
          }
        }
        issues(first:100, labels:["${STALE_LABEL}"], states:[OPEN]) {
          edges {
            node {
              id
              number
              title
              ${lastCommentWithDateQuery}
            }
          }
        }
      }
    }`
});
options.body = rootQuery;

// initialize log entry
// TODO: make log location configurable
appendFileSync('stale-issue-bot-log.txt', `\n--- START RUN: ${new Date().toLocaleString('en-US')} ---\n`);
appendFileSync('stale-issue-bot-log.txt', `\nThe following stale issues were closed:\n`);

// TODO: convert to async / await

// check github for issues with pending tag
let staleLabelId = undefined;
let staleIssues = [];
fetch(GH_ENDPOINT, options).then(r => r.json()).then(json => {
  if (json.data.repository.labels.edges && json.data.repository.labels.edges.length) {
    // grab the id of the staleness label so that we can remove it later if the issue is stale
    const staleLabel = json.data.repository.labels.edges[0].node;
    staleLabelId = staleLabel.id;
  } else {
    return;
  }

  if (json.data.repository.issues.edges && json.data.repository.issues.edges.length) {
    const issueEdges = json.data.repository.issues.edges;

    // check if the last comment of the issue qualifies as "stale"
    for (let i = 0; i < issueEdges.length; i++) {
      const issue = issueEdges[i];
      const lastComment = issue.node.comments.edges[0].node;
      const commentUpdateTime = new Date(lastComment.updatedAt);
      const now = Date.now();

      // mark issue as "stale"
      // TODO: check if author of comment is not the author of the thread???
      if ((now - commentUpdateTime) >= STALE_TIME_THRESHOLD) {
        console.log(`${issue.node.id} is stale`);
        staleIssues.push(issue.node.id);
        // log which issues were marked as stale
        // TODO: construct link to the issue that was marked and put it in the log
        appendFileSync('stale-issue-bot-log.txt', `\n\t${staleIssues.length}: ${issue.node.title}\n`);
      }
    }

    // go through stale issues and comment on them, remove the staleness label, and close them
    for (let i = 0; i < staleIssues.length; i++) {
      const issueId = staleIssues[i];
      // adds a comment explaining why we are closing the issue
      const commentQuery = `addComment(input: { subjectId:"${issueId}", body:"${STALENESS_COMMENT}" }) { clientMutationId }`;
      // removes the label that marked the issue for staleness tracking
      const removeStaleLabelQuery = `removeLabelsFromLabelable(input: { labelIds:["${staleLabelId}"], labelableId:"${issueId}" }) { clientMutationId }`;
      // closes the issue
      const closeIssueQuery = `closeIssue(input: { issueId:"${issueId}" }) { issue { id } }`;

      const wholeQuery = JSON.stringify({ query: `mutation HandleStaleIssue { ${commentQuery} ${removeStaleLabelQuery} ${closeIssueQuery} }` });
      options.body = wholeQuery;

      fetch(GH_ENDPOINT, options).then(r => r.json()).then(json => {
        console.log(json);
      });
    }
  }

  if (!staleIssues.length) {
    appendFileSync('stale-issue-bot-log.txt', `\n\tNo stale issues were detected.\n`);
  }

  appendFileSync('stale-issue-bot-log.txt', `\n--- END OF RUN ---\n`);
});
