const { suite, Test, suiteInstance } = require('../lib/mocha-setup')
const expect = require('chai').expect;
const reportValue = require('mochawesome/addContext')

const { readdirSync, statSync, readJSONSync } = require('fs-extra')
const { join } = require('path')
const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
const TESTDIRECTORY = '../auto-generated-tests'
const mainCategoriesList = dirs(join(__dirname, TESTDIRECTORY));
const { getLOVFieldsDataFromSalesforce, getMetadataDetails, getValidationRules } = require('../lib/utiltities');
const { INFO } = require('../lib/logging')

const categoryLevelTests = async (envName, category, objectList, parentEnvSuiteName) => {

    const parentCategorySuiteName = suiteInstance.create(parentEnvSuiteName, `Validate Tests for category - ${category === 'lovs' ? 'List Of Values' : category}`);
    const listOfObjectFiles = readdirSync(join(__dirname, `${TESTDIRECTORY}/${category}`))

    for (let i = 0; i < listOfObjectFiles.length; i++) {
        const fileName = listOfObjectFiles[i]
        const objectNameFromFileName = fileName.replace('.json', '').toLowerCase()

        if (!objectList.includes(objectNameFromFileName)) return

        const objectTests = readJSONSync(join(__dirname, `${TESTDIRECTORY}/${category}/${fileName}`));
        const objectLevelSuiteName = suiteInstance.create(parentCategorySuiteName, objectTests.TestSuiteName);
        const metadataDetails = await getMetadata(envName, category, objectNameFromFileName)
        if (typeof (metadataDetails) == 'string' && metadataDetails.includes('no record type exits')) {
            INFO(metadataDetails)
            objectLevelSuiteName.addTest(new Test('Validate at least one Record Type is available', function () {
                reportValue(this, `Metadata Details - ${metadataDetails}`)
                expect(metadataDetails).to.not.equal(`no record type exits`, `It appears no RecordType exist for this object (${objectNameFromFileName}). Hence, no individual LOV tests has been executed. `)
            }))
        } else {
            buildObjectLevelTests(objectLevelSuiteName, objectTests, metadataDetails, category)
        }
    }
}

const getMetadata = async (envName, category, objectName) => {
    if (category.includes('validation-rules')) {
        const metadata = await getMetadataDetails(envName, objectName);
        return getValidationRules(metadata)
    }
    else if (category.includes("lov"))
        return await getLOVFieldsDataFromSalesforce(envName, objectName)
}

const buildObjectLevelTests = (testSuite, objectTests, metadataDetails, checkType) => {
    for (let i = 0; i < objectTests.TestCases.length; i++) {
        const test = objectTests.TestCases[i]
        testSuite.addTest(new Test(test.TestCaseName, function () {
            const actualDetails = mappers[checkType](metadataDetails, test.inputData.name);
            reportValue(this, `Actual Details - ${JSON.stringify(actualDetails)}`)
            reportValue(this, `Expected Details - ${JSON.stringify(test.expectedOutput)}`)
            performAssertions(actualDetails, test)
        }))
    }
}

const performAssertions = (actualDetails, test) => {
    expect(actualDetails).to.not.equal(`Validation Rule ${test.inputData.name} Not found`, `Validation Rule -> "${test.inputData.name}" does not exist`)
    expect(actualDetails).to.not.equal(`Field ${test.inputData.name} Not found`, `Field -> "${test.inputData.name}" does not exist`)

    for (let i = 0; i < Object.keys(test.expectedOutput).length; i++) {
        const expectedKey = Object.keys(test.expectedOutput)[i]
        if (Array.isArray(test.expectedOutput[expectedKey])) {
            expect(test.expectedOutput[expectedKey]).to.have.deep.members(actualDetails[expectedKey]);
        } else {
            const actualValue = actualDetails[expectedKey].replace(/\n\s*/g, '\n')
            const expectedValue = test.expectedOutput[expectedKey]
            expect(expectedValue).to.equal(actualValue);
        }
    };
}

const DefineTests = async (envName, objectList) => {
    const parentEnvSuiteName = suite(`ORG -> ${envName}`);
    for (let i = 0; i < mainCategoriesList.length; i++) {
        const category = mainCategoriesList[i]
        await categoryLevelTests(envName, category, objectList, parentEnvSuiteName)
    }
}

const mappers = {
    "validation-rules": (validationRules, expectedName) => {
        const ruleDetails = validationRules.filter(item => item.fullName == expectedName)[0]
        if (typeof (ruleDetails) == 'undefined') return (`Validation Rule ${expectedName} Not found`)
        return ruleDetails;
    },
    "lovs": (picklistFieldValues, expectedName) => {
        const obj = {}
        try {
            obj['value'] = picklistFieldValues[expectedName].values.map(item => item.label)
            return obj;
        } catch (err) {
            return (`Field ${expectedName} Not found`);
        }
    }

}

module.exports = { DefineTests }