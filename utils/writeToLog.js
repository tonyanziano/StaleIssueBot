const { appendFileSync, existsSync } = require('fs');

function writeToLog(path, content) {
  if (!path || !existsSync(path)) {
    return;
  }
  try {
    appendFileSync(path, content);
  } catch (e) {
    console.error('Error while trying to write to log: ', e);
  }
}

module.exports = {
  writeToLog
};
