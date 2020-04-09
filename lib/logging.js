const ERROR = (message) => console.error('\x1b[31m%s\x1b[0m', `ERROR: \n ${message} \n`);
const INFO = (message) => console.log('\x1b[37m%s\x1b[0m', `INFO: \n ${typeof (message) == 'object' ? JSON.stringify(message) : message} \n`);
const WARNING = (message) => console.warn('\x1b[33m%s\x1b[0m', `WARNING: \n ${typeof (message) == 'object' ? JSON.stringify(message) : message} \n`);
const TABLE = (message) => console.table('\x1b[35m%s\x1b[0m', message);

module.exports = { ERROR, INFO, WARNING, TABLE }