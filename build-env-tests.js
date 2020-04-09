const { buildVLOVTestsforAllObjects, buildValidationRulesTestsforAllObjects } = require('./lib/utiltities');
const { INFO } = require('./lib/logging')

module.exports.BuildTests = async (envName = 'test', objectList = ['lead']) => {

    const buildValidationRuleTestsResponse = await buildValidationRulesTestsforAllObjects(envName, objectList)
    INFO(buildValidationRuleTestsResponse)
    const buildVLOVTestsResponse = await buildVLOVTestsforAllObjects(envName, objectList)
    INFO(buildVLOVTestsResponse)
    return 'All tests generated from base org'
}