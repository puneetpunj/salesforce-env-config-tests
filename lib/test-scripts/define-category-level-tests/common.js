const { Test } = require('../../mocha-setup')
const expect = require('chai').expect;
const { getLOVFieldsDataFromSalesforce } = require('../../generate-tests-from-base-org/lovs');
const { getValidationRulesMetadata } = require('./validation-rules');
const reportValue = require('mochawesome/addContext')

const getMetadata = async (envName, category, objectName) => {
    if (category.includes('validation-rules')) {
        return await getValidationRulesMetadata(envName, objectName)
    }
    else if (category.includes("lov"))
        return await getLOVFieldsDataFromSalesforce(envName, objectName)
}

const iterateTestsAndAddToMocha = (objectTests, testSuite, metadataDetails, checkType) => {
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
            const expectedValue = test.expectedOutput[expectedKey].replace(/\n\s*/g, '\n')
            expect(expectedValue).to.equal(actualValue);
        }
    };
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

module.exports = { iterateTestsAndAddToMocha, getMetadata }