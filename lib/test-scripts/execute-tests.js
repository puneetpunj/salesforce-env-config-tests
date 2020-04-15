
const { runMochaTests } = require('../mocha-setup');
const { INFO } = require('../logging')
module.exports.ExecuteTests = async () => {
    INFO('Starting Test Execution for All Destinations')
    try {
        const result = await runMochaTests()
        return result
    }
    catch (e) { return (e) }
}
