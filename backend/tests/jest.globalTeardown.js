const fs = require('fs/promises');
const { stateFile } = require('./jest.mongoState');

module.exports = async () => {
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop();
  }

  await fs.rm(stateFile, { force: true });
};
