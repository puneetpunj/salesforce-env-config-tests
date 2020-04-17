const path = require('path')
const { readJSONSync, readFileSync } = require('fs-extra')
const jsforce = require('jsforce')
const { getToken } = require('./sf-token-manager')
const privateKey = readFileSync(path.resolve(__dirname, './private.key'), 'utf8');

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
    const { username, conn, version, loginURL, sfConsumerKey } = getEnvironmentSpecificCredentials(envName)
    return await loginUsingCredentails(conn, loginURL, sfConsumerKey, username, privateKey)
}

const buildConnObjectParams = (envConfig) => {
    const params = {}
    typeof (envConfig.loginURL) != 'undefined' ? params.loginURL = envConfig.loginURL : params
    return params
}

const getEnvironmentSpecificCredentials = (envName) => {
    const config = readJSONSync(path.resolve(__dirname, `../config.json`));
    const envConfig = config.loginDetails[envName];
    const connParamsJSON = buildConnObjectParams(envConfig);
    const conn = new jsforce.Connection(connParamsJSON);
    const { username, loginURL, sfConsumerKey, version } = envConfig
    return { username, conn, version, loginURL, sfConsumerKey }
}

const loginUsingCredentails = (conn, instanceUrl, clientId, JWT_UserName, privateKey) => {
    return new Promise((resolve, reject) => {
        getToken(instanceUrl, clientId, privateKey, JWT_UserName, function (err, accessTokenReplyBody) {
            if (err) {
                console.error(err, err.stack);
                reject(err);
            };
            instanceUrlWithUserOrg = accessTokenReplyBody.instance_url;
            sfBearerToken = accessTokenReplyBody.access_token;
            console.log('Salesforce bearer token is ' + sfBearerToken);
            console.log('instanceUrlWithUserOrg is ' + instanceUrlWithUserOrg);
            conn.initialize({
                instanceUrl: accessTokenReplyBody.instance_url,
                accessToken: accessTokenReplyBody.access_token
            });
            resolve(conn)
        });
    })
}


module.exports = { autheticateAndSendRequestToSalesforce, getEnvironmentSpecificCredentials }