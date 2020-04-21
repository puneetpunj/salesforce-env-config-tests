const { autheticateAndSendRequestToSalesforce } = require('./salesforce-manager')
const { getEnvironmentSpecificCredentials } = require('./salesforce-manager')

// salesforce interaction specific functions
const sendSalesforceQuery = (envName, queryKeyName) => autheticateAndSendRequestToSalesforce(envName, 'runQuery', queryKeyName);
const getMetadataDetails = (envName, objname) => autheticateAndSendRequestToSalesforce(envName, 'metadata', objname);
const sendGetRequest = (envName, endpoint) => autheticateAndSendRequestToSalesforce(envName, 'GETRequest', endpoint);

const getVersionForCurrentEnv = (envName) => {
    const envConfigCreds = getEnvironmentSpecificCredentials(envName);
    return typeof (envConfigCreds.version) != 'undefined' ? envConfigCreds.version : 44
}

module.exports = {
    getMetadataDetails,
    sendSalesforceQuery,
    sendGetRequest,
    getVersionForCurrentEnv
}
