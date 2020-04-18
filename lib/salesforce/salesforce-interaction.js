const { autheticateAndSendRequestToSalesforce } = require('./salesforce-manager')

// salesforce interaction specific functions
const sendSalesforceQuery = (envName, queryKeyName) => autheticateAndSendRequestToSalesforce(envName, 'runQuery', queryKeyName);
const getMetadataDetails = (envName, objname) => autheticateAndSendRequestToSalesforce(envName, 'metadata', objname);
const sendGetRequest = (envName, endpoint) => autheticateAndSendRequestToSalesforce(envName, 'GETRequest', endpoint);


module.exports = {
    getMetadataDetails,
    sendSalesforceQuery,
    sendGetRequest
}
