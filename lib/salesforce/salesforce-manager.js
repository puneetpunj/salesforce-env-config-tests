const { readConfigFile } = require('../file-interactions')
const jsforce = require('jsforce')

const autheticateAndSendRequestToSalesforce = async (envName, requestType, objectName = 'contact') => {
    try {
        const conn = await setConnectionDetails(envName)
        return sendSalesforceRequest[requestType](conn, objectName)
    }
    catch (e) { return `error in logging to Salesforce ${e}` }
}

const sendSalesforceRequest = {
    "metadata": async (conn, objectName) => await conn.metadata.read('CustomObject', objectName, function (err, metadata) {
        if (err) return err;
        return metadata;
    }),
    "runQuery": async (conn, query) => await conn.query(query),
    "GETRequest": async (conn, endpoint) => await conn.requestGet(endpoint)
}

const setConnectionDetails = async (envName) => {
    const { username, password, securityToken, conn } = getEnvironmentSpecificCredentials(envName)
    return await loginUsingCredentails(conn, username, password, securityToken)
}

const buildConnObjectParams = (envConfig) => {
    const params = {}
    typeof (envConfig.loginURL) != 'undefined' ? params.loginURL = envConfig.loginURL : params
    return params
}

const getEnvironmentSpecificCredentials = (envName) => {
    const config = readConfigFile();
    const envConfig = config.loginDetails[envName];
    const connParamsJSON = buildConnObjectParams(envConfig);
    const conn = new jsforce.Connection(connParamsJSON);
    const { username, password, security_token: securityToken, version } = envConfig
    return { username, password, securityToken, conn, version }
}

const loginUsingCredentails = (conn, username, password, security_token) => {
    return new Promise((resolve, reject) => {
        conn.login(username, password + security_token, function (err, userInfo) {
            if (err) { reject(err); }
            resolve(conn)
        });
    })
}


module.exports = { autheticateAndSendRequestToSalesforce, getEnvironmentSpecificCredentials }