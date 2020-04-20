const { writeTestsOnJSONFile } = require('../file-interactions')
const { sendSalesforceQuery } = require('../salesforce/salesforce-interaction')

const buildAndWritePermissionSetTests = async (envName, objectList) => {

    const query = GETPermissionSetsQueryEndpoint(envName, objectList)
    const queryResults = await sendSalesforceQuery(envName, query)

    const objectLevelTests = queryResults.records.reduce((acc, record) => {
        if (typeof (acc[record.SobjectType]) === 'undefined') acc[record.SobjectType] = []
        acc[record.SobjectType].push(record)
        return acc
    }, {})

    return Object.keys(objectLevelTests).forEach(object => {
        const tests = buildTestsForPermissionSets(objectLevelTests[object])
        const allPermissionSetTests = {
            "TestSuiteName": `Check Permission Sets for object - ${object}`,
            ...tests
        }
        writeTestsOnJSONFile(`/permission-sets/${object.toLowerCase()}.json`, allPermissionSetTests)
        return 'done'
    })
}

const buildTestsForPermissionSets = (details) => {
    return {
        TestCases: details.map((record, index) => {
            return {
                id: index + 1,
                TestCaseName: `Validate Permission Sets for id - ${record.Id}`,
                inputData: {
                    name: record.Id
                },
                expectedOutput: {
                    PermissionsCreate: record.PermissionsCreate,
                    PermissionsDelete: record.PermissionsDelete,
                    PermissionsEdit: record.PermissionsEdit,
                    PermissionsModifyAllRecords: record.PermissionsModifyAllRecords,
                    PermissionsRead: record.PermissionsRead,
                    PermissionsViewAllRecords: record.PermissionsViewAllRecords
                }
            }
        })
    }
}

const GETPermissionSetsQueryEndpoint = (envName, objectList) => {
    return `SELECT Id,PermissionsCreate,PermissionsDelete,PermissionsEdit,PermissionsModifyAllRecords,PermissionsRead,PermissionsViewAllRecords,SobjectType FROM ObjectPermissions where SobjectType IN ('${objectList.join("','")}')`
}

module.exports = { buildAndWritePermissionSetTests }