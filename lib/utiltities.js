const path = require('path')
const fs = require('fs-extra')
const { autheticateAndSendRequestToSalesforce, getEnvironmentSpecificCredentials } = require('./salesforce/sf-manager')
const TESTDIR = '../generated-tests'

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
    writeTestsOnJSONFile(path.resolve(__dirname, `${TESTDIR}/validation-rules/${object}.json`), TestCasesJSON)
}


// lovs related helper functions
const buildEndpointForLOVQuery = async (envName, objectName) => {
    const query = `SELECT id FROM RecordType where SobjectType ='${objectName}'`
    const recordTypeDetails = await sendSalesforceQuery(envName, query);
    return GETLOVQueryEndpoint(envName, objectName, recordTypeDetails)
}
const getVersionForCurrentEnv = (envName) => {
    const envConfigCreds = getEnvironmentSpecificCredentials(envName);
    return typeof (envConfigCreds.version) != 'undefined' ? envConfigCreds.version : 44
}
const GETLOVQueryEndpoint = (envName, objectName, recordTypeDetails) => {
    const version = getVersionForCurrentEnv(envName)
    return recordTypeDetails.totalSize > 0 ? `/services/data/v${version}.0/ui-api/object-info/${objectName}/picklist-values/${recordTypeDetails.records[0].Id}` : '';
}

const getLOVFieldsDataFromSalesforce = async (envName, object) => {
    const LOVQueryEndpoint = await buildEndpointForLOVQuery(envName, object);
    if (!LOVQueryEndpoint) { console.log('\x1b[31m%s\x1b[0m', `looks like no record type for object - ${object} exits`); return }
    const queryResponse = await sendGetRequest(envName, LOVQueryEndpoint);
    return queryResponse.picklistFieldValues
}
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
                    value: lovs[field].values.map(value => value.label)
                }
            }
        })
    }
}
const buildAndWriteLOVTests = (object, fieldDetails) => {
    const allLOVTests = buildTestsForLOVs(object, fieldDetails)
    writeTestsOnJSONFile(path.resolve(__dirname, `${TESTDIR}/lovs/${object}.json`), allLOVTests)
}


// generic function for all types to write tests locally
const writeTestsOnJSONFile = (path, tests) => {
    console.log(`successfully written tests at path - ${path}`);
    fs.writeFileSync(path, JSON.stringify(tests))
}


// build and write tests for all in scope objects
const buildVLOVTestsforAllObjects = (envName, objectList) => {
    return Promise.all(objectList.map(async object => {
        const fieldsDetails = await getLOVFieldsDataFromSalesforce(envName, object)
        if (typeof (fieldsDetails) == 'object')
            buildAndWriteLOVTests(object, fieldsDetails)
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


// salesforce interaction specific functions
const sendSalesforceQuery = (envName, queryKeyName) => autheticateAndSendRequestToSalesforce(envName, 'runQuery', queryKeyName);
const getMetadataDetails = (envName, objname) => autheticateAndSendRequestToSalesforce(envName, 'metadata', objname);
const sendGetRequest = (envName, endpoint) => autheticateAndSendRequestToSalesforce(envName, 'GETRequest', endpoint);


const sampleCredentialsPresent = (envName) => {
    const creds = getEnvironmentSpecificCredentials(envName);
    const sampleKeys = Object.keys(creds).filter(i => typeof (creds[i]) == 'string' && creds[i].includes('sample'));
    return sampleKeys.length > 0 ? true : false
}

module.exports = {
    getMetadataDetails,
    buildVLOVTestsforAllObjects,
    buildValidationRulesTestsforAllObjects,
    sampleCredentialsPresent,
    getLOVFieldsDataFromSalesforce,
    getValidationRules,
    sendSalesforceQuery,
    getVersionForCurrentEnv
}