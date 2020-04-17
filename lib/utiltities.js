const path = require('path')
const fs = require('fs-extra')
const { autheticateAndSendRequestToSalesforce, getEnvironmentSpecificCredentials } = require('./salesforce-manager')
const TESTDIR = '../auto-generated-tests'
const { SUCCESS, WARNING } = require('./logging')

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
    const query = `SELECT id, Name FROM RecordType where SobjectType ='${objectName}'`
    const recordTypeDetails = await sendSalesforceQuery(envName, query);
    const LOVEndpoints = {}
    for (let i = 0; i < recordTypeDetails.totalSize; i++) {
        LOVEndpoints[recordTypeDetails.records[i].Name] = GETLOVQueryEndpoint(envName, objectName, recordTypeDetails.records[i].Id)
    }
    return LOVEndpoints
}
const getVersionForCurrentEnv = (envName) => {
    const envConfigCreds = getEnvironmentSpecificCredentials(envName);
    return typeof (envConfigCreds.version) != 'undefined' ? envConfigCreds.version : 44
}
const GETLOVQueryEndpoint = (envName, objectName, id) => {
    const version = getVersionForCurrentEnv(envName)
    return `/services/data/v${version}.0/ui-api/object-info/${objectName}/picklist-values/${id}`;
}

const getLOVFieldsDataFromSalesforce = async (envName, object) => {
    const LOVQueryEndpoint = await buildEndpointForLOVQuery(envName, object);
    if (LOVQueryEndpoint == {}) { WARNING(`Looks like no record type for object - ${object} exits in ORG -> ${envName}`); return 'no record type exits' };
    const final = {}
    const keysArray = Object.keys(LOVQueryEndpoint).map(rt => rt)
    for (let i = 0; i < keysArray.length; i++) {
        const recordType = keysArray[i]
        const queryResponse = await sendGetRequest(envName, LOVQueryEndpoint[recordType]);
        final[recordType] = queryResponse.picklistFieldValues
    }
    return final
}

const buildTestsForLOVs = (objectName, lovs) => {
    return {
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

const buildAndWriteLOVTests = (object, fieldDetailsPerRecordType) => {
    const allLOVTests = { TestSuiteName: `Check LOVs for object - ${object}` }

    Object.keys(fieldDetailsPerRecordType).forEach(rt => {
        allLOVTests[rt] = buildTestsForLOVs(object, fieldDetailsPerRecordType[rt])
        allLOVTests[rt]['RecordTypeTestSuiteName'] = `Check LOVs for record type - ${rt}`
    })

    writeTestsOnJSONFile(path.resolve(__dirname, `${TESTDIR}/lovs/${object}.json`), allLOVTests)
}


// generic function for all types to write tests locally
const writeTestsOnJSONFile = (path, tests) => {
    SUCCESS(`Successfully written tests at path - ${path}`);
    fs.writeFileSync(path, JSON.stringify(tests))
}

const readConfigFile = () => fs.readJSONSync(path.resolve(__dirname, `../config.json`))

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


// salesforce interaction specific functions
const sendSalesforceQuery = (envName, queryKeyName) => autheticateAndSendRequestToSalesforce(envName, 'runQuery', queryKeyName);
const getMetadataDetails = (envName, objname) => autheticateAndSendRequestToSalesforce(envName, 'metadata', objname);
const sendGetRequest = (envName, endpoint) => autheticateAndSendRequestToSalesforce(envName, 'GETRequest', endpoint);


const sampleCredentialsPresent = (envName) => {
    const creds = readConfigFile().loginDetails[envName];
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
    getVersionForCurrentEnv,
    readConfigFile
}