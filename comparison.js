const { writeJSONSync } = require('fs-extra');
const { ERROR, INFO, WARNING, SUCCESS, DECORATIVELOG } = require('./lib/logging')
const { sampleCredentialsPresent, sendSalesforceQuery, readConfigFile } = require('./lib/utiltities');
const configFileDetails = readConfigFile();
const { AutoGenerateTests } = require('./lib/build-env-tests');
const { DefineTests } = require('./lib/test-scripts/define-tests')
const { ExecuteTests } = require('./lib/test-scripts/execute-tests')
const { printReportTable } = require('./lib/print-report-table')

const checkSalesforceCredKeysAvailable = creds => typeof (creds) == 'object' ? true : false

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

const getOnlyValidObjects = (baseArray, secondaryArray, orgName) => {
    const validObjects = baseArray.reduce((acc, i) => {
        if (secondaryArray.includes(i.toLowerCase())) acc.push(i)
        else WARNING(`Object - ${i} is not present in Object List of Org -> ${orgName}`)
        return acc
    }, [])
    return validObjects;
}

const getvalidObjectsForAnOrg = async Org => {
    const inputObjectList = configFileDetails.objectList[Org]

    INFO(`Input objects list for ${Org} org is [${inputObjectList}]`)

    const objectListWithQuotes = "'" + inputObjectList.join("','") + "'";
    const query = `Select QualifiedApiName from EntityDefinition where QualifiedApiName IN (${objectListWithQuotes}) order by QualifiedApiName`
    const OrgObjectsInSalesforce = await sendSalesforceQuery(Org, query)
    if (typeof (OrgObjectsInSalesforce) == 'string' && OrgObjectsInSalesforce.includes('INVALID_LOGIN')) return OrgObjectsInSalesforce

    if (OrgObjectsInSalesforce.totalSize == inputObjectList.length) return inputObjectList

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

const defineTestsForAllDestinationOrgs = (destinationOrgs, validDestinationOrgObjects) => {
    printAsterics()
    DECORATIVELOG('Start defining tests for all destination Orgs')
    return Promise.all(destinationOrgs.map(async destinationOrg => {
        INFO(`Defining Tests for Org - ${destinationOrg} and Object List - [${validDestinationOrgObjects[destinationOrg]}]`)
        await DefineTests(destinationOrg, validDestinationOrgObjects[destinationOrg]);
        SUCCESS(`Tests defined for all objects for Org -> ${destinationOrg}`)
    }))

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


const checkErrors = () => {

    if (!checkBaseAndDestinationOrgs(configFileDetails)) { ERROR('Looks like Base Org and Destination orgs keys are not defined correctly in input json. \n\n You can define only one "baseOrg" and "destinationOrgs" must be an array even if you want to specify only 1 destination'); return true }

    const { baseOrg, destinationOrgs } = configFileDetails;

    if (!checkObjectsForAllOrgsExists(baseOrg, destinationOrgs)) { ERROR('Looks like "objectList" array does not exist for all base/destination orgs. Check config.json file.'); return true }

    if (!checkConfigExists(baseOrg, destinationOrgs)) { ERROR('Config files for all specified base and destination orgs are not present. Go to config dir to add config files'); return true }

    if (checkSampleCredentialsForAllEnv(baseOrg, destinationOrgs)) { ERROR('Looks like you have not setup your credentials in the org specific config file. \n \n Add/update config.json with actual credentials'); return true }

    return false

}

const printAsterics = () => console.log('*'.repeat(80));


const autoGenerateTestsForBaseOrg = async (baseOrg, validBaseOrgObjects) => {
    if (configFileDetails.generateBaseTests) {
        // Build Tests referencing Base Org
        printAsterics()
        DECORATIVELOG('Start auto generation of test files using base org')
        const buildTestsResponse = await AutoGenerateTests(baseOrg, validBaseOrgObjects);
        SUCCESS(buildTestsResponse)
        writeJSONSync('./config.json', { ...configFileDetails, generateBaseTests: false })
    }
}

const executeTestsAndGenerateReport = async () => {
    // Execute Actual tests and generate report
    printAsterics()
    const executionResults = await ExecuteTests();
    INFO(executionResults)
}


(async () => {

    if (checkErrors()) return
    SUCCESS('No error found in setup.')
    const { baseOrg, destinationOrgs } = configFileDetails;

    // Fetch Valid Objects for Base Org
    printAsterics()
    DECORATIVELOG('Starting to Get Valid Objects for Base Org')
    const validBaseOrgObjects = await getvalidObjectsForAnOrg(baseOrg)
    if (validBaseOrgObjects.includes('INVALID_LOGIN')) return ERROR(`Your base Org (${baseOrg}) credentials are incorrect`);
    if (validBaseOrgObjects.length == 0) { ERROR('No valid object specified in input file for Base Org'); return }
    SUCCESS(`Valid Object List for Base Org - [${validBaseOrgObjects}]`)

    // Fetch Valid Objects for Destination Orgs
    printAsterics()
    DECORATIVELOG(`Starting to Get Valid Objects for Base Org using username - ${readConfigFile().loginDetails[baseOrg].username}`)
    const validDestinationOrgObjects = await getDestinationOrgsValidObjects(destinationOrgs, validBaseOrgObjects)
    if (typeof (validDestinationOrgObjects) == 'string' && validDestinationOrgObjects.includes('INVALID_LOGIN')) return ERROR(validDestinationOrgObjects);
    SUCCESS(`Valid Object List for all Destination Orgs is - ${JSON.stringify(validDestinationOrgObjects)} `)

    await autoGenerateTestsForBaseOrg(baseOrg, validBaseOrgObjects)

    await defineTestsForAllDestinationOrgs(destinationOrgs, validDestinationOrgObjects)

    await executeTestsAndGenerateReport()

    printReportTable();

})()