require('dotenv').config()
const { join } = require('path');

const { executeQuery } = require('./utils/executeQuery');
const { writeToLog } = require('./utils/writeToLog');

// main function
async function run(options) {
  const {
    freshLabel = 'customer-replied-to',
    locale = 'en-US', // locale for log timestamps
    logFilePath = '', // path to file to use for logging
    repo = '', // repo name
    repoOwner = '', // repo owner
    staleTimeThreshold = 1000 * 60 * 60 * 24 * 2, // 48 days
    staleLabel = '', // label that will mark an issue for tracking
    stalenessComment = '' // comment to leave before closing the issue
  } = options;

  const query = {
    query:
    `{
      repository(owner:"${repoOwner}", name:"${repo}") {
        issues(first:100, labels: ["customer-replied-to"], states: [OPEN]) {
          edges {
            node {
              title
            }
          }
        }
      }
    }`
  };

  console.log('Fetching issues for repo...');

  let res;
  try {
    res = await executeQuery(query);
    res = await res.json();
  } catch (e) {
    console.error(e);
    return;
  }

  const detectedIssues = res.data.repository.issues.edges;
  const numOfDetectedIssues = detectedIssues.length;

  console.log(`Detected ${numOfDetectedIssues} customer-reported issues that have not yet been replied to.`);
  detectedIssues.forEach(edge => console.log(edge.node.title));

  // query that fetches:
  //   1. the label associated with staleness
  //   2. the first 100 issues that are tagged with the label
  //   3. the last comment of each issue and its last updated time
  // const rootQuery = {
  //   query: 
  //     `{
  //       repository(owner:"${repoOwner}", name:"${repo}") {
  //         labels(first:1, query:"${staleLabel}") {
  //           edges {
  //             node {
  //               id
  //             }
  //           }
  //         }
  //         issues(first:100, labels:["${staleLabel}"], states:[OPEN]) {
  //           edges {
  //             node {
  //               id
  //               number
  //               title
  //               comments(last:1) {
  //                 edges {
  //                   node {
  //                     id
  //                     updatedAt
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }`
  // };
  
  // // initialize log entry
  // writeToLog(logFilePath, `\n--- START RUN: ${new Date().toLocaleString(locale)} ---\n`);
  // writeToLog(logFilePath, `\nThe following stale issues were closed:\n`);

  // try {
  //   let staleIssues = [];
  //   let staleLabelId = undefined;
  //   const queryRes = await executeQuery(rootQuery);
  //   const queryJson = await queryRes.json();

  //   if (queryJson.data.repository.labels.edges && queryJson.data.repository.labels.edges.length) {
  //     // grab the id of the staleness label so that we can remove it later if the issue is stale
  //     const staleLabel = queryJson.data.repository.labels.edges[0].node;
  //     staleLabelId = staleLabel.id;
  //   }

  //   if (!staleLabelId) {
  //     throw new Error('Could not find staleness label.');
  //   }
  
  //   if (queryJson.data.repository.issues.edges && queryJson.data.repository.issues.edges.length) {
  //     const issueEdges = queryJson.data.repository.issues.edges;
  
  //     // check if the last comment of the issue qualifies as "stale"
  //     for (let i = 0; i < issueEdges.length; i++) {
  //       const issue = issueEdges[i];
  //       const lastComment = issue.node.comments.edges[0].node;
  //       const commentUpdateTime = new Date(lastComment.updatedAt);
  //       const now = Date.now();
  
  //       // mark issue as "stale"
  //       // TODO: check if author of comment is not the author of the thread???
  //       if ((now - commentUpdateTime) >= staleTimeThreshold) {
  //         console.log(`${issue.node.id} is stale`);
  //         staleIssues.push(issue.node.id);
  //         // log which issues were marked as stale
  //         // TODO: construct link to the issue that was marked and put it in the log
  //         writeToLog(logFilePath, `\n\t${staleIssues.length}: ${issue.node.title}\n`);
  //       }
  //     }
  
  //     // go through stale issues and comment on them, remove the staleness label, and close them
  //     for (let i = 0; i < staleIssues.length; i++) {
  //       const issueId = staleIssues[i];
  //       // adds a comment explaining why we are closing the issue
  //       const commentQuery = `addComment(input: { subjectId:"${issueId}", body:"${stalenessComment}" }) { clientMutationId }`;
  //       // removes the label that marked the issue for staleness tracking
  //       const removeStaleLabelQuery = `removeLabelsFromLabelable(input: { labelIds:["${staleLabelId}"], labelableId:"${issueId}" }) { clientMutationId }`;
  //       // closes the issue
  //       const closeIssueQuery = `closeIssue(input: { issueId:"${issueId}" }) { issue { id } }`;
  
  //       const wholeQuery = JSON.stringify({ query: `mutation HandleStaleIssue { ${commentQuery} ${removeStaleLabelQuery} ${closeIssueQuery} }` });
  //       fetchOptions.body = wholeQuery;
  
  //       // TODO: add error handling
  //       const mutationRes = await fetch(GH_ENDPOINT, fetchOptions);
  //     }
  //   }

  //   if (!staleIssues.length) {
  //     writeToLog(logFilePath, `\n\tNo stale issues were detected.\n`);
  //   }
  // } catch (e) {
  //   console.log('There was an error: ', e);
  // }
  
  // writeToLog(logFilePath, `\n--- END OF RUN ---\n`);
}

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
