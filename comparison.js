const fs = require('fs-extra');
const path = require('path')
const { ERROR, INFO, WARNING, TABLE } = require('./lib/logging')
const { sampleCredentialsPresent, sendSalesforceQuery } = require('./lib/utiltities');
const inscopeData = fs.readJSONSync('./inscope-object-list.json');
const { BuildTests } = require('./build-env-tests');
const { DefineTests } = require('./test-scripts/define-tests')
const { ExecuteTests } = require('./test-scripts/execute-tests')

const checkConfigFileExists = (baseOrg, destinationOrg) => {
    try {
        fs.readJSONSync(path.resolve(__dirname, `./config/config.${baseOrg}.json`));
        destinationOrg.forEach(file => fs.readJSONSync(path.resolve(__dirname, `./config/config.${file}.json`)))
        return true
    }
    catch (e) {
        ERROR(e)
        return false
    }
}

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


const defineTestsForAllDestinationOrgs = (destinationOrgs, validDestinationOrgObjects) => {

    return Promise.all(destinationOrgs.map(async destinationOrg => {
        INFO(`Building Tests for Org - ${destinationOrg} and Object List - ${validDestinationOrgObjects[destinationOrg]}`)
        await DefineTests(destinationOrg, validDestinationOrgObjects[destinationOrg]);
        INFO('Tests defined for ' + destinationOrg)
    }))

}

const checkObjectsForAllOrgsExists = (baseOrg, destinationOrgs) => {

    const baseOrgOLArray = Array.isArray(inscopeData[`${baseOrg}.objectList`])
    const destOrgOLArray = destinationOrgs.map(d => Array.isArray(inscopeData[`${d}.objectList`]))
    return baseOrgOLArray ? destOrgOLArray.includes(false) ? false : true : false
}

const checkBaseAndDestinationOrgs = (json) => {
    const { baseOrg, destinationOrgs } = json
    return typeof (baseOrg) == 'string' ? Array.isArray(destinationOrgs) ? true : false : false
}


const checkErrors = () => {

    if (!checkBaseAndDestinationOrgs(inscopeData)) { ERROR('Looks like Base Org and Destination orgs keys are not defined correctly in input json. \n\n You can define only one "baseOrg" and "destinationOrgs" must be an array even if you want to specify only 1 destination'); return true }

    const { baseOrg, destinationOrgs } = inscopeData;

    if (!checkObjectsForAllOrgsExists(baseOrg, destinationOrgs)) { ERROR('Looks like "objectList" array does not exist for all base/destination orgs'); return true }

    if (!checkConfigFileExists(baseOrg, destinationOrgs)) { ERROR('Config files for all specified base and destination orgs are not present. Go to config dir to add config files'); return true }

    if (checkSampleCredentialsForAllEnv(baseOrg, destinationOrgs)) { ERROR('Looks like you have not setup your credentials in the org specific config file. \n \n Add/update config/config.<env>.json with actual credentials'); return true }

    return false

}
(async () => {

    if (checkErrors()) return

    const { baseOrg, destinationOrgs } = inscopeData;

    // Fetch Valid Objects for Base Org
    const validBaseOrgObjects = await getvalidObjectsForAnOrg(baseOrg)
    if (validBaseOrgObjects.includes('INVALID_LOGIN')) return ERROR(`Your base Org (${baseOrg}) credentials are incorrect`);
    INFO(`Valid Object List for Base Org - ${validBaseOrgObjects}`)
    if (validBaseOrgObjects.length == 0) { ERROR('No valid object specified in input file for Base Org'); return }

    // Fetch Valid Objects for Destination Orgs
    const validDestinationOrgObjects = await getDestinationValidObjects(destinationOrgs, validBaseOrgObjects)
    if (typeof (validDestinationOrgObjects) == 'string' && validDestinationOrgObjects.includes('INVALID_LOGIN')) return ERROR(validDestinationOrgObjects);
    INFO(`Valid Object List for Destination Org - ${JSON.stringify(validDestinationOrgObjects)}`)

    // Build Tests referencing Base Org
    const buildTestsResponse = await BuildTests(baseOrg, validBaseOrgObjects);
    INFO(buildTestsResponse)

    // Define Tests for each Destination
    await defineTestsForAllDestinationOrgs(destinationOrgs, validDestinationOrgObjects)

    // Execute Actual tests and generate report
    const executionResults = await ExecuteTests();
    INFO(executionResults)

})()