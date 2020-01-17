require('dotenv').config()
const { join } = require('path');

const { executeQuery } = require('./utils/executeQuery');
const { writeToLog } = require('./utils/writeToLog');

// main function
async function run(options) {
  const {
    freshLabel = 'customer-replied-to', // label that changes a "stale" issue to "fresh"
    locale = 'en-US', // locale for log timestamps
    logFilePath = '', // path to file to use for logging
    repo = '', // repo name
    repoOwner = '', // repo owner
    staleTimeThreshold = 1000 * 60 * 60 * 24 * 2, // 48 days
    staleLabel = 'customer-reported', // label that will mark an issue for tracking
    stalenessComment = '' // comment to leave before closing the issue
  } = options;

  const query = {
    query:
    `{
      repository(owner:"${repoOwner}", name:"${repo}") {
        issues(first: 100, labels: ["${staleLabel}"], states: [OPEN]) {
          nodes {
            createdAt
            comments(last: 1) {
              nodes {
                createdAt
              }
            }
            labels(first: 25) {
              nodes {
                name
              }
            }
            title
            url
          }
        }
      }
    }`
  };

  let res;
  try {
    res = await executeQuery(query);
    res = await res.json();
  } catch (e) {
    console.error(e);
    return;
  }

  // all issues with the staleness label
  const issues = res.data.repository.issues.nodes;

  // filter out issues with the stale label that also have the fresh label
  const staleIssues = [];
  issues.forEach(issueNode => {
    if (issueNode.labels.nodes.length) {
      let isStale = true;
      for (let i = 0; i < issueNode.labels.nodes.length; i++) {
        const labelNode = issueNode.labels.nodes[i];
        // the issue is fresh and we don't care about the rest of the labels
        if (labelNode.name === freshLabel) {
          isStale = false;
          break;
        }
      }
      // add the stale issue 
      isStale && staleIssues.push(issueNode);
    }
  });

  console.log(`Detected ${staleIssues.length} issue(s) with the [${staleLabel}] label that have not yet been marked with the [${freshLabel}] label:`);
  staleIssues.forEach(staleIssue => {
    let mostRecentInteractionTimestamp;
    if (staleIssue.comments.nodes.length) {
      // use the time of the most recent comment
      mostRecentInteractionTimestamp = staleIssue.commends.nodes[0].createdAt;
    } else {
      // use the time of the body
      mostRecentInteractionTimestamp = staleIssue.createdAt;
    }
    console.log(`${staleIssue.title} - Last comment was at: ${new Date(mostRecentInteractionTimestamp).toString()} (${staleIssue.url})`);
  });

// example run
run({
  logFilePath: join(__dirname, 'stale-issues-log.txt'),
  repo: 'StaleIssueBot',
  repoOwner: 'tonyanziano',
  staleTimeThreshold: 1000 * 60 * 5,
  staleLabel: 'customer-reported',
  stalenessComment: 'Closing due to inactivity...'
})
.then(_res => console.log('Success!'))
.catch(err => console.log('Failure: ', err));
