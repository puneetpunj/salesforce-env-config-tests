const { buildVLOVTestsforAllObjects, buildValidationRulesTestsforAllObjects } = require('./lib/utiltities');

(async () => {
    const objectList = ['contact', 'account', 'lead'];

    const r = await buildValidationRulesTestsforAllObjects(objectList)
    console.log(r)

    const a = await buildVLOVTestsforAllObjects(objectList)
    console.log(a)

})()