const { buildVLOVTestsforAllObjects, buildValidationRulesTestsforAllObjects, buildPermissionSetTests } = require('./utiltities');
const { sendGetRequest, getVersionForCurrentEnv } = require('./salesforce/salesforce-interaction')
const { INFO, WARNING } = require('./logging')

module.exports.AutoGenerateTests = async (envName = 'test', objectList = ['lead']) => {

    INFO(`Start building tests for Validation Rules using base Org - ${envName}`)
    await buildValidationRulesTestsforAllObjects(envName, objectList)
    INFO(`Finished writing tests for Validation Rules for Base Org -> ${envName}`)

    INFO(`Start building tests for LOVs using base Org - ${envName}`)
    // further refine using ui-api info 
    const validUIAPIObjectsList = await getValidUIAPIObjects(envName, objectList);
    await buildVLOVTestsforAllObjects(envName, validUIAPIObjectsList)
    INFO(`Finished writing tests for LOVs for Base Org -> ${envName}`)

    if (false) {
        INFO(`Start building tests for Permission Sets using base Org - ${envName}`)
        await buildPermissionSetTests(envName, objectList)
        INFO(`Finished writing tests for Permission Set for Base Org -> ${envName}`)
    }

    return 'All tests generated from base org'
}

const getValidUIAPIObjects = async (envName, objectList) => {
    let version = await getVersionForCurrentEnv(envName);
    const query = `/services/data/v${version}/ui-api/object-info`
    const queryResult = await sendGetRequest(envName, query)
    return getOnlyValidObjects(objectList, Object.keys(queryResult.objects))
}

const getOnlyValidObjects = (baseArray, secondaryArray) => {
    const validObjects = baseArray.reduce((acc, i) => {

        if (secondaryArray.filter(org => org.toLowerCase() === i.toLowerCase()).length > 0) acc.push(i)
        else WARNING(`UI API can not be used for this object - ${i}. Hence, LOV tests would not be generated.`)
        return acc
    }, [])
    return validObjects;
}