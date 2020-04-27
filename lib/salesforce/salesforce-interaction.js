const { autheticateAndSendRequestToSalesforce } = require('./salesforce-manager')
const { getEnvironmentSpecificCredentials } = require('./salesforce-manager')

// salesforce interaction specific functions
const sendSalesforceQuery = (envName, queryKeyName) => autheticateAndSendRequestToSalesforce(envName, 'runQuery', queryKeyName);
const getMetadataDetails = (envName, objname) => autheticateAndSendRequestToSalesforce(envName, 'metadata', objname);
const sendGetRequest = (envName, endpoint) => autheticateAndSendRequestToSalesforce(envName, 'GETRequest', endpoint);
const { INFO } = require('../logging')

const getVersionForCurrentEnv = async (envName) => {
    if (typeof (process.env.UIAPIVERSION) === 'undefined') {
        const envConfigCreds = getEnvironmentSpecificCredentials(envName);
        if (typeof (envConfigCreds.version) !== 'undefined') return envConfigCreds.version.toString().includes('.0') ? envConfigCreds.version : `${envConfigCreds.version.toString()}.0`
        INFO('Getting latest version from Salesforce for UI API for org ' + envName)
        const allVersions = await sendGetRequest(envName, '/services/data')
        process.env.UIAPIVERSION = allVersions[allVersions.length - 1].version
    }
    return process.env.UIAPIVERSION
}

module.exports = {
    getMetadataDetails,
    sendSalesforceQuery,
    sendGetRequest,
    getVersionForCurrentEnv
}
