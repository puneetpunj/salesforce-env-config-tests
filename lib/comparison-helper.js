const _ = require('lodash')
const { sampleCredentialsPresent } = require('./utiltities');
const { readConfigFile, updateGenerateBaseTestsKeyInConfig } = require('./file-interactions');
const configFileDetails = readConfigFile();
const { sendSalesforceQuery } = require('./salesforce/salesforce-interaction');
const { ERROR, INFO, WARNING, SUCCESS, DECORATIVELOG, PRINTASTERICS } = require('./logging')
const { AutoGenerateTests } = require('./build-env-tests');
const { DefineTests } = require('./test-scripts/define-tests')
const { ExecuteTests } = require('./test-scripts/execute-tests')


const getValidBaseOrgObjectsList = async (baseOrg) => {
    // Fetch Valid Objects for Base Org
    PRINTASTERICS()
    DECORATIVELOG('Starting to Get Valid Objects for Base Org')
    const validBaseOrgObjects = await getvalidObjectsForAnOrg(baseOrg)
    if (validBaseOrgObjects.includes('INVALID_LOGIN')) {
        ERROR(`Your base Org (${baseOrg}) credentials are incorrect`);
        return false
    }
    if (validBaseOrgObjects.length == 0) {
        ERROR('No valid object specified in input file for Base Org');
        return false
    }
    SUCCESS(`Valid Object List for Base Org - [${validBaseOrgObjects}]`)
    return validBaseOrgObjects
}

const getDestinationOrgsValidObjectsList = async (destinationOrgs, validBaseOrgObjects) => {
    // Fetch Valid Objects for Destination Orgs
    PRINTASTERICS()
    DECORATIVELOG(`Starting to Get Valid Objects for Destination Orgs ${destinationOrgs}`)
    const validDestinationOrgObjects = await getDestinationOrgsValidObjects(destinationOrgs, validBaseOrgObjects)
    if (typeof (validDestinationOrgObjects) == 'string' && validDestinationOrgObjects.includes('INVALID_LOGIN')) {
        ERROR(validDestinationOrgObjects);
        return false;
    }
    SUCCESS(`Valid Object List for all Destination Orgs is - ${JSON.stringify(validDestinationOrgObjects)} `)
    return validDestinationOrgObjects
}


const checkErrors = () => {

    if (!checkBaseAndDestinationOrgs(configFileDetails)) { ERROR('Looks like Base Org and Destination orgs keys are not defined correctly in input json. \n\n You can define only one "baseOrg" and "destinationOrgs" must be an array even if you want to specify only 1 destination'); return true }

    const { baseOrg, destinationOrgs } = configFileDetails;

    if (!checkObjectsForAllOrgsExists(baseOrg, destinationOrgs)) { ERROR('Looks like "objectList" array does not exist for all base/destination orgs. Check config.json file.'); return true }

    if (!checkConfigExists(baseOrg, destinationOrgs)) { ERROR('Login details for specified base and destination orgs are not present in config.json. Please update and rerun program'); return true }

    if (checkSampleCredentialsForAllEnv(baseOrg, destinationOrgs)) { ERROR('Looks like you have not setup your credentials in the org specific config file. \n \n Add/update config.json with actual credentials'); return true }

    return false

}

const getvalidObjectsForAnOrg = async Org => {
    const inputObjectList = configFileDetails.objectList[Org]

    INFO(`Input objects list for ${Org} org is [${inputObjectList}]`)

    const objectListWithQuotes = "'" + inputObjectList.join("','") + "'";
    const query = `Select QualifiedApiName from EntityDefinition where QualifiedApiName IN (${objectListWithQuotes}) order by QualifiedApiName`
    const OrgObjectsInSalesforce = await sendSalesforceQuery(Org, query)
    if (typeof (OrgObjectsInSalesforce) == 'string' && OrgObjectsInSalesforce.includes('INVALID_LOGIN')) return OrgObjectsInSalesforce

    if (OrgObjectsInSalesforce.totalSize == inputObjectList.length) return inputObjectList
    console.log(OrgObjectsInSalesforce)
    const SalesforceObjectArray = OrgObjectsInSalesforce.records.map(i => i.QualifiedApiName.toLowerCase())
    const validObjects = getOnlyValidObjects(inputObjectList, SalesforceObjectArray, Org)
    return validObjects
}
const getDestinationOrgsValidObjects = async (OrgArray, baseObjectsArray) => {
    let validDestinationObjects = {}
    for (let i = 0; i < OrgArray.length; i++) {
        const validSalesforceObjects = await getvalidObjectsForAnOrg(OrgArray[i])
        if (validSalesforceObjects.includes('INVALID_LOGIN')) return `Org - ${OrgArray[i]} --> ${validSalesforceObjects}`

        INFO(`Valid Object List from Salesforce for ORG -> ${OrgArray[i]} is -> [${validSalesforceObjects}]`)

        INFO(`Filter further as comparison to Base Org Objects - [${baseObjectsArray}]`)

        // further filter down based on baseOrg's valid Objects
        validDestinationObjects[OrgArray[i]] = getOnlyValidObjects(baseObjectsArray, validSalesforceObjects, OrgArray[i])

        SUCCESS(`Final valid Object List from destination org -> ${OrgArray[i]} is -> [${validDestinationObjects[OrgArray[i]]}]`)
    }
    return validDestinationObjects;
}
const getOnlyValidObjects = (baseArray, secondaryArray, orgName) => {
    const validObjects = baseArray.reduce((acc, i) => {
        if (secondaryArray.includes(i.toLowerCase())) acc.push(i)
        else WARNING(`Object - ${i} is not present in Object List of Org -> ${orgName}`)
        return acc
    }, [])
    return validObjects;
}

const checkConfigExists = (baseOrg, destinationOrg) => {
    const baseOrgCreds = configFileDetails.loginDetails[baseOrg]
    const baseOrgCredsCheck = checkSalesforceCredKeysAvailable(baseOrgCreds)
    const destOrgCredsCheck = destinationOrg.map(org => {
        const destOrgCreds = configFileDetails.loginDetails[org]
        const destOrgCredsCheck = checkSalesforceCredKeysAvailable(destOrgCreds)
        return destOrgCredsCheck
    })
    return baseOrgCredsCheck && destOrgCredsCheck.reduce((acc, i) => { acc = i && acc; return acc }, true)
}

const checkSampleCredentialsForAllEnv = (baseOrg, destinationOrgs) => {
    const checkBaseOrg = sampleCredentialsPresent(baseOrg)
    const checkDestinationOrg = destinationOrgs.map(destinationOrg => sampleCredentialsPresent(destinationOrg))
    return checkBaseOrg || checkDestinationOrg.reduce((acc, i) => { acc = i || acc; return acc }, false)
}

const checkObjectsForAllOrgsExists = (baseOrg, destinationOrgs) => {

    const baseOrgOLArray = Array.isArray(configFileDetails.objectList[baseOrg])
    const destOrgOLArray = destinationOrgs.map(d => Array.isArray(configFileDetails.objectList[d]))
    return baseOrgOLArray ? destOrgOLArray.includes(false) ? false : true : false
}

const checkBaseAndDestinationOrgs = (json) => {
    const { baseOrg, destinationOrgs } = json
    return typeof (baseOrg) == 'string' ? Array.isArray(destinationOrgs) ? true : false : false
}

const checkSalesforceCredKeysAvailable = creds => {

    const keysToValidate = ['loginURL', 'username'];
    const result = keysToValidate.map(key => _.has(creds, key) ? true : false)
    if (_.has(creds, 'usernameAndPasswordAuth.inUse') && creds.usernameAndPasswordAuth.inUse) {
        const keysPresence = ['password', 'security_token'].map(key => _.has(creds.usernameAndPasswordAuth, key) ? true : false)
        result.push(keysPresence)
    } else if (_.has(creds, 'oAuth.inUse') && creds.oAuth.inUse) {
        const keysPresence = ['consumerKey'].map(key => _.has(creds.oAuth, key) ? true : false)
        result.push(keysPresence)
    }
    else {
        result.push(false)
    }
    return _.flatMap(result).includes(false) ? false : true;
}

const defineTestsForAllDestinationOrgs = (destinationOrgs, validDestinationOrgObjects) => {
    PRINTASTERICS()
    DECORATIVELOG('Start defining tests for all destination Orgs')
    return Promise.all(destinationOrgs.map(async destinationOrg => {
        INFO(`Defining Tests for Org - ${destinationOrg} and Object List - [${validDestinationOrgObjects[destinationOrg]}]`)
        await DefineTests(destinationOrg, validDestinationOrgObjects[destinationOrg]);
        SUCCESS(`Tests defined for all objects for Org -> ${destinationOrg}`)
    }))
}

const autoGenerateTestsForBaseOrg = async (baseOrg, validBaseOrgObjects) => {
    if (configFileDetails.generateBaseTests) {
        // Build Tests referencing Base Org
        PRINTASTERICS()
        DECORATIVELOG('Start auto generation of test files using base org')
        const buildTestsResponse = await AutoGenerateTests(baseOrg, validBaseOrgObjects);
        SUCCESS(buildTestsResponse)
        updateGenerateBaseTestsKeyInConfig(configFileDetails)
    }
}

const executeTestsAndGenerateReport = async () => {
    // Execute Actual tests and generate report
    PRINTASTERICS()
    const executionResults = await ExecuteTests();
    INFO(executionResults)
}
module.exports = { checkErrors, getValidBaseOrgObjectsList, getDestinationOrgsValidObjectsList, defineTestsForAllDestinationOrgs, autoGenerateTestsForBaseOrg, executeTestsAndGenerateReport }