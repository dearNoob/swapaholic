const os = require('os');
const path = require('path');

const stateFile = path.join(os.tmpdir(), 'swapaholic-backend-jest-mongodb.json');

module.exports = {
  stateFile
};
