var request = require('request');
var jwt = require('jsonwebtoken');

module.exports.getToken = function (instanceUrl, clientId, privateKey, userName, cb) {
    var options = {

        issuer: clientId,
        audience: instanceUrl,
        expiresIn: 5 * 60 * 60,
        algorithm: 'RS256'
    }
    // console.log('clientId is ' + clientId + ' userName is ' + userName + ' privateKey is ' + privateKey);

    var token = jwt.sign({ prn: userName }, privateKey, options);
    // console.log('token ' + token);
    var post = {
        uri: instanceUrl + '/services/oauth2/token',
        form: {
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': token
        },
        method: 'post'
    }

    request(post, function (err, res, body) {

        if (err) {
            cb(err);
            return;
        };

        var reply = JsonTryParse(body);

        if (!reply) {
            cb(new Error('No response from oauth endpoint.'));
            return;
        };

        if (res.statusCode != 200) {
            var message = 'Unable to authenticate: ' + reply.error + ' (' + reply.error_description + ')';
            cb(new Error(message))
            return;
        };

        cb(null, reply);
    });
}

function JsonTryParse(string) {
    try {
        return JSON.parse(string);
    } catch (e) {
        return null;
    }
}