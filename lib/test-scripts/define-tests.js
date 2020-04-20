const { suite, suiteInstance } = require('../mocha-setup')
const { mainCategoriesList, getListOfFilesInDir, readJSONFile } = require('../file-interactions')
const { getMetadata, iterateTestsAndAddToMocha } = require('./define-category-level-tests/common')
const { defineLOVspecificTests } = require('./define-category-level-tests/lovs')
const { WARNING } = require('../logging')
const reportValue = require('mochawesome/addContext')
const expect = require('chai').expect;

const DefineTests = async (envName, objectList) => {
    const parentEnvSuiteName = suite(`ORG -> ${envName}`);
    for (let i = 0; i < mainCategoriesList.length; i++) {
        const category = mainCategoriesList[i]
        await categoryLevelTests(envName, category, objectList, parentEnvSuiteName)
    }
}

const categoryLevelTests = async (envName, category, objectList, parentEnvSuiteName) => {

    const parentCategorySuiteName = suiteInstance.create(parentEnvSuiteName, `Validate Tests for category - ${category === 'lovs' ? 'List Of Values' : category}`);
    const listOfObjectFiles = getListOfFilesInDir(category)

    await defineTestsForEachObjectFile(listOfObjectFiles, objectList, category, parentCategorySuiteName, envName)
}

const defineTestsForEachObjectFile = async (listOfObjectFiles, objectList, category, parentCategorySuiteName, envName) => {
    for (let i = 0; i < listOfObjectFiles.length; i++) {
        const fileName = listOfObjectFiles[i]
        const objectNameFromFileName = fileName.replace('.json', '').toLowerCase()

        if (!objectList.includes(objectNameFromFileName)) {
            WARNING(`${objectNameFromFileName} object does not exist in Object List in config.json for org - ${envName}, hence not generating tests for ${category}`)
        } else {
            const objectTests = readJSONFile(`${category}/${fileName}`)
            const objectLevelSuiteName = suiteInstance.create(parentCategorySuiteName, objectTests.TestSuiteName);
            const metadataDetails = await getMetadata(envName, category, objectNameFromFileName)
            defineTestsBasedOnMetadata(metadataDetails, objectLevelSuiteName, objectTests, category)
        }
    }
}

const defineTestsBasedOnMetadata = (metadataDetails, objectLevelSuiteName, objectTests, category) => {
    if (typeof (metadataDetails) == 'string' && metadataDetails.includes('no record type exits')) {
        objectLevelSuiteName.addTest(new Test('Validate at least one Record Type is available', function () {
            reportValue(this, `Metadata Details - ${metadataDetails}`)
            expect(metadataDetails).to.not.equal(`no record type exits`, `It appears no RecordType exist for this object (${objectNameFromFileName}). Hence, no LOV tests has been executed. `)
        }))
    } else {
        buildObjectLevelTests[category](objectTests, objectLevelSuiteName, metadataDetails)
    }
}

const buildObjectLevelTests = {

    'validation-rules': (objectTests, testSuite, metadataDetails) => iterateTestsAndAddToMocha(objectTests, testSuite, metadataDetails,
        'validation-rules'),
    'lovs': (objectTests, testSuite, metadataDetails) => defineLOVspecificTests(objectTests, testSuite, metadataDetails, 'lovs'),
    'permission-sets': (objectTests, testSuite, metadataDetails) => iterateTestsAndAddToMocha(objectTests, testSuite, metadataDetails, 'permission-sets')
}
module.exports = { DefineTests }