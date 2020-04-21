const { readConfigFile, readPrivateKey } = require('../file-interactions')
const jsforce = require('jsforce')
const credentials = {};

const autheticateAndSendRequestToSalesforce = async (envName, requestType, objectName = 'contact') => {
    try {
        if (typeof (credentials[envName]) === 'undefined') {
            const conn = await setConnectionDetails(envName)
            credentials[envName] = conn
        }
        return sendSalesforceRequest[requestType](credentials[envName], objectName)
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
    const envCreds = getEnvironmentSpecificCredentials(envName);
    const { username, loginType, conn } = envCreds
    if (loginType === 'usernameAndPasswordAuth') {
        const { password, security_token } = envCreds
        return await loginUsingCredentails(conn, username, password, security_token)
    }
    const { consumerKey, loginURL } = envCreds
    const privateKey = readPrivateKey();
    return await loginUsingoAuth(conn, loginURL, consumerKey, username, privateKey)
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
    const conn = new jsforce.Connection(connParamsJSON)
    const { loginURL, username, version } = envConfig

    if (envConfig.usernameAndPasswordAuth.inUse) {
        const { password, security_token } = envConfig.usernameAndPasswordAuth
        const loginType = 'usernameAndPasswordAuth'
        return { username, password, security_token, conn, version, loginType }
    }
    const loginType = 'oAuth'
    const { consumerKey } = envConfig;
    return { loginURL, username, consumerKey, conn, version, loginType }
}

const loginUsingCredentails = (conn, username, password, security_token) => {
    return new Promise((resolve, reject) => {
        conn.login(username, password + security_token, function (err, userInfo) {
            if (err) { reject(err); }
            resolve(conn)
        });
    })
}

const loginUsingoAuth = (conn, instanceUrl, consumerKey, username, privateKey) => {
    return new Promise((resolve, reject) => {
        getToken(instanceUrl, consumerKey, privateKey, username, function (err, accessTokenReplyBody) {
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