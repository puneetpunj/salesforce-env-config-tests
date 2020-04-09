const { buildVLOVTestsforAllObjects, buildValidationRulesTestsforAllObjects } = require('./lib/utiltities');

module.exports.BuildTests = async (envName = 'test', objectList = ['lead']) => {

    const r = await buildValidationRulesTestsforAllObjects(envName, objectList)
    console.log(r)
    const a = await buildVLOVTestsforAllObjects(envName, objectList)
    console.log(a)
    return 'All tests generated from base org'
}