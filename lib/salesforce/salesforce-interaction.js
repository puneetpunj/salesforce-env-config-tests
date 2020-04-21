const { autheticateAndSendRequestToSalesforce } = require('./salesforce-manager')
const { getEnvironmentSpecificCredentials } = require('./salesforce-manager')

// salesforce interaction specific functions
const sendSalesforceQuery = (envName, queryKeyName) => autheticateAndSendRequestToSalesforce(envName, 'runQuery', queryKeyName);
const getMetadataDetails = (envName, objname) => autheticateAndSendRequestToSalesforce(envName, 'metadata', objname);
const sendGetRequest = (envName, endpoint) => autheticateAndSendRequestToSalesforce(envName, 'GETRequest', endpoint);

const getVersionForCurrentEnv = async (envName) => {
    const envConfigCreds = getEnvironmentSpecificCredentials(envName);
    if (typeof (envConfigCreds.version) !== 'undefined') return envConfigCreds.version.toString().includes('.0') ? envConfigCreds.version : `${envConfigCreds.version.toString()}.0`
    const allVersions = await sendGetRequest('QA', '/services/data')
    return allVersions[allVersions.length - 1].version
}

module.exports = {
    getMetadataDetails,
    sendSalesforceQuery,
    sendGetRequest,
    getVersionForCurrentEnv
}
