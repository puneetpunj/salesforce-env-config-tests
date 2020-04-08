const path = require('path')
const fs = require('fs-extra')
const { autheticateAndSendRequestToSalesforce, getEnvironmentSpecificCredentials } = require('./salesforce/sf-manager')


// validation rule related helper functions
const getValidationRules = (metadata) => typeof (metadata.validationRules) == 'undefined' ? [] : Array.isArray(metadata.validationRules) ? metadata.validationRules : [metadata.validationRules];
const buildTestsForValidationRules = (objectName, dataArray) => {
    return {
        TestSuiteName: `Check Validation Rules for object - ${objectName}`,
        TestCases: dataArray.map((data, index) => {
            return {
                id: index + 1,
                TestCaseName: `Validate Validation Rule - ${data.fullName}`,
                inputData: {
                    name: data.fullName
                },
                expectedOutput: {
                    active: data.active, errorConditionFormula: data.errorConditionFormula, errorMessage: data.errorMessage
                }
            }
        })
    }
}
const buildAndWriteValidationRulesTests = (object, objectMetadata) => {
    const validationRules = getValidationRules(objectMetadata);
    const TestCasesJSON = buildTestsForValidationRules(object, validationRules);
    writeTestsOnJSONFile(path.resolve(__dirname, `../tests/validation-rules/${object}.json`), TestCasesJSON)
}


// lovs related helper functions
const buildEndpointForLOVQuery = async (objectName) => {
    const query = `SELECT id FROM RecordType where SobjectType ='${objectName}'`
    const recordTypeDetails = await sendSalesforceQuery(query);
    return GETLOVQueryEndpoint(objectName, recordTypeDetails)
}
const GETLOVQueryEndpoint = (objectName, recordTypeDetails) => {
    const envConfigCreds = getEnvironmentSpecificCredentials();
    const version = typeof (envConfigCreds.version) != 'undefined' ? envConfigCreds.version : 44
    return recordTypeDetails.totalSize > 0 ? `/services/data/v${version}.0/ui-api/object-info/${objectName}/picklist-values/${recordTypeDetails.records[0].Id}` : '';
}
const getLOVFieldsDataFromMetadata = (m) => m.picklistFieldValues
const buildTestsForLOVs = (objectName, lovs) => {
    return {
        TestSuiteName: `Check LOVs for object - ${objectName}`,
        TestCases: Object.keys(lovs).map((field, index) => {
            return {
                id: index + 1,
                TestCaseName: `Validate LOVs for field - ${field}`,
                inputData: {
                    name: field
                },
                expectedOutput: {
                    values: lovs[field].values.map(value => value.label)
                }
            }
        })
    }
}
const buildAndWriteLOVTests = (object, fieldDetails) => {
    const allLOVTests = buildTestsForLOVs(object, fieldDetails)
    writeTestsOnJSONFile(path.resolve(__dirname, `../tests/lovs/${object}.json`), allLOVTests)
}


// generic function for all types to write tests locally
const writeTestsOnJSONFile = (path, tests) => {
    console.log(`successfully written tests at path - ${path}`);
    fs.writeFileSync(path, JSON.stringify(tests))
}


// build and write tests for all in scope objects
const buildVLOVTestsforAllObjects = (objectList) => {
    return Promise.all(objectList.map(async object => {
        const LOVQueryEndpoint = await buildEndpointForLOVQuery(object);
        if (!LOVQueryEndpoint) return `looks like no record type for object - ${object} exits`
        const queryResponse = await sendGetRequest(LOVQueryEndpoint);
        const fieldsDetails = getLOVFieldsDataFromMetadata(queryResponse)
        buildAndWriteLOVTests(object, fieldsDetails)
        return ('done')

    }))
}
const buildValidationRulesTestsforAllObjects = (objectList) => {
    return Promise.all(objectList.map(async object => {
        const objectMetadata = await getMetadataDetails(object);
        buildAndWriteValidationRulesTests(object, objectMetadata)
        return ('done')
    }))
};


// salesforce interaction specific functions
const sendSalesforceQuery = (queryKeyName) => autheticateAndSendRequestToSalesforce('runQuery', queryKeyName);
const getMetadataDetails = (objname) => autheticateAndSendRequestToSalesforce('metadata', objname);
const sendGetRequest = (endpoint) => autheticateAndSendRequestToSalesforce('GETRequest', endpoint);


const sampleCredentialsPresent = () => {
    const creds = getEnvironmentSpecificCredentials();
    const sampleKeys = Object.keys(creds).filter(i => i != 'conn' && typeof (creds[i]) != 'number' && creds[i].includes('sample'));
    return sampleKeys.length > 0 ? true : false
}
const getObjectListFromInputFile = () => fs.readJSONSync(path.resolve(__dirname, '../inscope-object-list.json'))


module.exports = { getObjectListFromInputFile, buildVLOVTestsforAllObjects, buildValidationRulesTestsforAllObjects, sampleCredentialsPresent }