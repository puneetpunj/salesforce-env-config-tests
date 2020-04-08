const { buildVLOVTestsforAllObjects, getObjectListFromInputFile, buildValidationRulesTestsforAllObjects, sampleCredentialsPresent } = require('./lib/utiltities');

(async () => {
    const objectList = getObjectListFromInputFile();
    if (sampleCredentialsPresent()) { console.error('\x1b[31m%s\x1b[0m', 'Error: \n Set your credentials in the env specific config file. \n Set in config/config.<env>.json'); return }
    const r = await buildValidationRulesTestsforAllObjects(objectList)
    console.log(r)
    const a = await buildVLOVTestsforAllObjects(objectList)
    console.log(a)
})()