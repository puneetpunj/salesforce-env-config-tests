
const { runMochaTests } = require('../lib/mocha-setup');
const { buildTests } = require('./define-tests');
const { INFO } = require('../lib/logging')
module.exports.ExecuteTests = async (envName = 'test', objectList = ['lead']) => {

    INFO(`Running Tests for ENV - ${envName} and Object List - ${objectList}`)
    await buildTests(envName, objectList);

    try {
        const result = await runMochaTests()
        return result
    }
    catch (e) { return (e) }
}
