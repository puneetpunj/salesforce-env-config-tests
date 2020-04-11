const { readJSONSync } = require('fs-extra');
const config = readJSONSync(require('path').resolve(__dirname, `../config.json`)).LOGGING || {}
const checkConfig = type => config[type] || typeof (config[type]) == 'undefined' ? true : false


const ERROR = message => checkConfig('ERROR') ? console.error('\x1b[31m%s\x1b[0m', `ERROR: \n ${message} \n`) : '';

const INFO = message => checkConfig('INFO') ? console.log('\x1b[37m%s\x1b[0m', `INFO: \n ${typeof (message) == 'object' ? JSON.stringify(message) : message} \n`) : '';

const WARNING = message => checkConfig('WARNING') ? console.warn('\x1b[33m%s\x1b[0m', `WARNING: \n ${typeof (message) == 'object' ? JSON.stringify(message) : message} \n`) : '';

const TABLE = message => checkConfig('TABLE') ? console.table(message) : '';

const SUCCESS = message => checkConfig('SUCCESS') ? console.log('\x1b[32m%s\x1b[0m', `SUCCESS: \n ${typeof (message) == 'object' ? JSON.stringify(message) : message} \n`) : '';

const LOG = message => checkConfig('LOG') ? console.log(`\n ${typeof (message) == 'object' ? JSON.stringify(message) : message} \n`) : '';

module.exports = { ERROR, INFO, WARNING, LOG, SUCCESS, TABLE }