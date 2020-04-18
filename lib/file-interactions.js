const { readdirSync, statSync, readJSONSync, writeFileSync, writeJSONSync } = require('fs-extra')
const { join, resolve } = require('path')
const { SUCCESS } = require('./logging')
const TESTDIR = '../auto-generated-tests'


// generic function for all types to write tests locally
const writeTestsOnJSONFile = (dirPath, tests) => {
    SUCCESS(`Successfully written tests at path - ${dirPath}`);
    writeFileSync(resolve(__dirname, `${TESTDIR}${dirPath}`), JSON.stringify(tests))
}
const updateGenerateBaseTestsKeyInConfig = (existingContent) => { writeJSONSync('./config.json', { ...existingContent, generateBaseTests: false }) }
const readConfigFile = () => readJSONSync(resolve(__dirname, `../config.json`))

const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
const mainCategoriesList = dirs(join(__dirname, TESTDIR));

const getListOfFilesInDir = (folder) => readdirSync(join(__dirname, `${TESTDIR}/${folder}`))

const readJSONFile = (filePath) => readJSONSync(join(__dirname, `${TESTDIR}/${filePath}`));

module.exports = {
    writeTestsOnJSONFile,
    readConfigFile,
    mainCategoriesList,
    getListOfFilesInDir,
    readJSONFile,
    updateGenerateBaseTestsKeyInConfig
}