const { getLOVFieldsDataFromSalesforce, buildAndWriteLOVTests } = require('./generate-tests-from-base-org/lovs')
const { getMetadataDetails } = require('./salesforce/salesforce-interaction')
const { buildAndWriteValidationRulesTests } = require('./generate-tests-from-base-org/validation-rules')
const { readConfigFile } = require('./file-interactions')

// build and write tests for all in scope objects
const buildVLOVTestsforAllObjects = (envName, objectList) => {
    return Promise.all(objectList.map(async object => {
        const fieldsDetailsPerRecordType = await getLOVFieldsDataFromSalesforce(envName, object)
        if (typeof (fieldsDetailsPerRecordType) == 'object')
            buildAndWriteLOVTests(object, fieldsDetailsPerRecordType)
        return ('done')
    }))
}

const buildValidationRulesTestsforAllObjects = (envName, objectList) => {
    return Promise.all(objectList.map(async object => {
        const objectMetadata = await getMetadataDetails(envName, object);
        buildAndWriteValidationRulesTests(object, objectMetadata)
        return ('done')
    }))
};

const sampleCredentialsPresent = (envName) => {
    const creds = readConfigFile().loginDetails[envName];
    const sampleKeys = Object.keys(creds).filter(i => typeof (creds[i]) == 'string' && creds[i].includes('sample'));
    return sampleKeys.length > 0 ? true : false
}

module.exports = {
    buildVLOVTestsforAllObjects,
    buildValidationRulesTestsforAllObjects,
    sampleCredentialsPresent
}