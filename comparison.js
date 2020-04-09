const fs = require('fs-extra');
const { ERROR, INFO, WARNING, TABLE } = require('./lib/logging')
const { sampleCredentialsPresent, sendSalesforceQuery } = require('./lib/utiltities');
const inscopeData = fs.readJSONSync('./inscope-object-list.json');
const { baseOrg, destinationOrg } = inscopeData;
const { BuildTests } = require('./build-env-tests');
const { ExecuteTests } = require('./tests/execute-tests')

// TODO: Check first if config file exists
const checkSampleCredentialsForAllEnv = (baseOrg, destinationOrgs) => {
    const checkBaseOrg = sampleCredentialsPresent(baseOrg)
    const checkDestinationOrg = destinationOrgs.map(destinationOrg => sampleCredentialsPresent(destinationOrg))
    return checkBaseOrg || checkDestinationOrg.reduce((acc, i) => { acc = i || acc; return acc }, false)
}

const getOnlyValidObjects = (baseArray, secondaryArray, orgName) => {
    const validObjects = baseArray.reduce((acc, i) => {
        if (secondaryArray.includes(i.toLowerCase())) acc.push(i)
        else WARNING(`Object - ${i} is not present in Org -> ${orgName}`)
        return acc
    }, [])
    return validObjects;
}

// TODO: Get objects from each org
const getvalidObjectsForAnOrg = async (Org) => {
    const inputObjectList = inscopeData[`${Org}.objectList`]
    const objectListWithQuotes = "'" + inputObjectList.join("','") + "'";
    const query = `Select QualifiedApiName from EntityDefinition where QualifiedApiName IN (${objectListWithQuotes}) order by QualifiedApiName`
    const OrgObjectsInSalesforce = await sendSalesforceQuery(Org, query)
    if (typeof (OrgObjectsInSalesforce) == 'string' && OrgObjectsInSalesforce.includes('INVALID_LOGIN')) return OrgObjectsInSalesforce

    if (OrgObjectsInSalesforce.totalSize == inputObjectList.length) return inputObjectList
    const SalesforceObjectArray = OrgObjectsInSalesforce.records.map(i => i.QualifiedApiName.toLowerCase())
    const validObjects = getOnlyValidObjects(inputObjectList, SalesforceObjectArray, Org)
    return validObjects
}

const getDestinationValidObjects = async (OrgArray, baseObjectsArray) => {
    let validDestinationObjects = {}
    for (let i = 0; i < OrgArray.length; i++) {
        const validSalesforceObjects = await getvalidObjectsForAnOrg(OrgArray[i])
        if (validSalesforceObjects.includes('INVALID_LOGIN')) return `Org - ${OrgArray[i]} --> ${validSalesforceObjects}`
        // further filter down based on baseOrg's valid Objects
        validDestinationObjects[OrgArray[i]] = getOnlyValidObjects(baseObjectsArray, validSalesforceObjects, OrgArray[i])
    }
    return validDestinationObjects;
}
(async () => {

    // if (checkSampleCredentialsForAllEnv(baseOrg, destinationOrg)) return ERROR('Set your credentials in the env specific config file. \n Set in config/config.<env>.json')

    // // Fetch Valid Objects for Base Org
    const validBaseOrgObjects = await getvalidObjectsForAnOrg(baseOrg)
    if (validBaseOrgObjects.includes('INVALID_LOGIN')) return ERROR(`Your base Org (${baseOrg}) credentials are incorrect`);
    INFO(`Valid Object List for Base Org - ${validBaseOrgObjects}`)
    if (validBaseOrgObjects.length == 0) { ERROR('No valid object specified in input file'); return }

    // Fetch Valid Objects for Destination Orgs
    const validDestinationOrgObjects = await getDestinationValidObjects(destinationOrg, validBaseOrgObjects)
    if (typeof (validDestinationOrgObjects) == 'string' && validDestinationOrgObjects.includes('INVALID_LOGIN')) return ERROR(validDestinationOrgObjects);
    INFO(`Valid Object List for Destination Org - ${JSON.stringify(validDestinationOrgObjects)}`)

    // const buildTestsResponse = await BuildTests(baseOrg, validBaseOrgObjects);
    // INFO(buildTestsResponse)

    const executionResults = await ExecuteTests(destinationOrg[0], validDestinationOrgObjects[destinationOrg[0]]);
    INFO(executionResults)
})()