const { SUCCESS } = require('./lib/logging')
const { readConfigFile } = require('./lib/file-interactions');
const configFileDetails = readConfigFile();
const { printReportTable } = require('./lib/print-report-table');
const { checkErrors, getDestinationOrgsValidObjectsList, getValidBaseOrgObjectsList, defineTestsForAllDestinationOrgs, autoGenerateTestsForBaseOrg, executeTestsAndGenerateReport } = require('./lib/comparison-helper');

(async () => {

    if (checkErrors()) return
    SUCCESS('No error found in setup.')
    const { baseOrg, destinationOrgs } = configFileDetails;

    const validBaseOrgObjects = await getValidBaseOrgObjectsList(baseOrg)
    if (!validBaseOrgObjects) return;

    const validDestinationOrgObjects = await getDestinationOrgsValidObjectsList(destinationOrgs, validBaseOrgObjects)
    if (!validDestinationOrgObjects) return;

    await autoGenerateTestsForBaseOrg(baseOrg, validBaseOrgObjects)

    await defineTestsForAllDestinationOrgs(destinationOrgs, validDestinationOrgObjects)

    await executeTestsAndGenerateReport()

    printReportTable();

})()