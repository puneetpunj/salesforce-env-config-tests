const path = require('path')
const fs = require('fs-extra')
const jsforce = require('jsforce')

const autheticateAndSendRequestToSalesforce = async (requestType, objectName = 'contact') => {
    try {
        const conn = await setConnectionDetails()
        return sendSalesforceRequest[requestType](conn, objectName)
    }
    catch (e) { throw e }
}

const sendSalesforceRequest = {
    "metadata": async (conn, objectName) => await conn.metadata.read('CustomObject', objectName, function (err, metadata) {
        if (err) return err;
        return metadata;
    }),
    "runQuery": async (conn, query) => await conn.query(query),
    "GETRequest": async (conn, endpoint) => await conn.requestGet(endpoint)
}

const setConnectionDetails = async () => {
    const { username, password, securityToken, conn } = getEnvironmentSpecificCredentials()
    return await loginUsingCredentails(conn, username, password, securityToken)
}

const buildConnObjectParams = (envConfig) => {
    const params = {}
    typeof (envConfig.loginURL) != 'undefined' ? params.loginURL = envConfig.loginURL : params
    return params
}

const getEnvironmentSpecificCredentials = () => {
    const envName = process.env.ENVIRONMENT || 'test'
    const envConfig = fs.readJSONSync(path.resolve(__dirname, "../../config/config." + envName + ".json"));
    const connParamsJSON = buildConnObjectParams(envConfig);
    const conn = new jsforce.Connection(connParamsJSON);
    const username = envConfig.username
    const password = envConfig.password
    const securityToken = envConfig.security_token
    const version = envConfig.version
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