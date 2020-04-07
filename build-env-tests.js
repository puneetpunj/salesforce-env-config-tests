const { buildVLOVTestsforAllObjects, buildValidationRulesTestsforAllObjects, sampleCredentialsPresent } = require('./lib/utiltities');

(async () => {
    const objectList = ['contact', 'account', 'lead'];
    if (sampleCredentialsPresent()) { console.error('Set your credentials in the env specific config file'); return }

    const r = await buildValidationRulesTestsforAllObjects(objectList)
    console.log(r)

    const a = await buildVLOVTestsforAllObjects(objectList)
    console.log(a)

})()