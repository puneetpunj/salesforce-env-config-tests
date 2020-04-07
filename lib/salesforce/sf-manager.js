const path = require('path')
const fs = require('fs')
const jsforce = require('jsforce')
const conn = new jsforce.Connection({ loginUrl: 'https://login.salesforce.com' })

const autheticateAndSendRequestToSalesforce = async (requestType, objectName = 'contact') => {
    try {
        await setConnectionDetails()
        return sendSalesforceRequest[requestType](objectName)
    }
    catch (e) { throw e }
}

const sendSalesforceRequest = {
    "metadata": async (objectName) => await conn.metadata.read('CustomObject', objectName, function (err, metadata) {
        if (err) return err;
        return metadata;
    }),
    "runQuery": async (query) => await conn.query(query)
    ,
    "GETRequest": async (endpoint) => await conn.requestGet(endpoint)
}

const setConnectionDetails = async () => {

    if (typeof (conn.accessToken) == 'undefined') {
        const credentails = getEnvironmentSpecificCredentials()
        await loginUsingCredentails(credentails.username, credentails.password, credentails.securityToken)
    }
    return conn;
}

const getEnvironmentSpecificCredentials = () => {

    const envName = process.env.ENVIRONMENT || 'test'
    const envConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../config/config." + envName + ".json")));
    const username = envConfig.username
    const password = envConfig.password
    const securityToken = envConfig.security_token
    return { username, password, securityToken }
}

const loginUsingCredentails = (username, password, security_token) => {
    return new Promise((resolve, reject) => {
        conn.login(username, password + security_token, function (err, userInfo) {
            if (err) { reject(err); }
            resolve(conn)
        });
    })
}


module.exports = { autheticateAndSendRequestToSalesforce, getEnvironmentSpecificCredentials }