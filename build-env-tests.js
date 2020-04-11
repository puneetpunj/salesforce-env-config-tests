const { buildVLOVTestsforAllObjects, buildValidationRulesTestsforAllObjects } = require('./lib/utiltities');
const { INFO } = require('./lib/logging')

module.exports.BuildTests = async (envName = 'test', objectList = ['lead']) => {

    INFO(`Start building tests for Validation Rules using base Org - ${envName}`)
    await buildValidationRulesTestsforAllObjects(envName, objectList)
    // INFO(buildValidationRuleTestsResponse)
    INFO(`Finished writing tests for Validation Rules for Base Org -> ${envName}`)
    INFO(`Start building tests for LOVs using base Org - ${envName}`)
    await buildVLOVTestsforAllObjects(envName, objectList)
    INFO(`Finished writing tests for LOVs for Base Org -> ${envName}`)
    return 'All tests generated from base org'
}