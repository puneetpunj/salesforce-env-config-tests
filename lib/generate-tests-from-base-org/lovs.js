const { WARNING } = require('../logging');
const { writeTestsOnJSONFile } = require('../file-interactions')
const { sendSalesforceQuery, sendGetRequest } = require('../salesforce/salesforce-interaction')
const { getVersionForCurrentEnv } = require('../salesforce/salesforce-interaction')

// lovs related helper functions
const buildAndWriteLOVTests = (object, fieldDetailsPerRecordType) => {
    const allLOVTests = { TestSuiteName: `Check LOVs for object - ${object}` }

    Object.keys(fieldDetailsPerRecordType).forEach(rt => {
        allLOVTests[rt] = buildTestsForLOVs(object, fieldDetailsPerRecordType[rt])
        allLOVTests[rt]['RecordTypeTestSuiteName'] = `Check LOVs for record type - ${rt}`
    })

    writeTestsOnJSONFile(`/lovs/${object}.json`, allLOVTests)
}

const buildEndpointForLOVQuery = async (envName, objectName) => {
    const query = `SELECT id, Name FROM RecordType where SobjectType ='${objectName}'`
    const recordTypeDetails = await sendSalesforceQuery(envName, query);
    const LOVEndpoints = {}
    for (let i = 0; i < recordTypeDetails.totalSize; i++) {
        LOVEndpoints[recordTypeDetails.records[i].Name] = GETLOVQueryEndpoint(envName, objectName, recordTypeDetails.records[i].Id)
    }
    return LOVEndpoints
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


module.exports = {
    getLOVFieldsDataFromSalesforce,
    buildAndWriteLOVTests
}