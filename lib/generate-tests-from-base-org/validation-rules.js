const { writeTestsOnJSONFile } = require('../file-interactions')

// validation rule related helper functions
const buildAndWriteValidationRulesTests = (object, objectMetadata) => {
    const validationRules = getValidationRules(objectMetadata);
    const TestCasesJSON = buildTestsForValidationRules(object, validationRules);
    writeTestsOnJSONFile(`/validation-rules/${object}.json`, TestCasesJSON)
}
const getValidationRules = (metadata) => typeof (metadata.validationRules) == 'undefined' ? [] : Array.isArray(metadata.validationRules) ? metadata.validationRules : [metadata.validationRules];
const buildTestsForValidationRules = (objectName, dataArray) => {
    return {
        TestSuiteName: `Check Validation Rules for object - ${objectName}`,
        TestCases: dataArray.map((data, index) => {
            return {
                id: index + 1,
                TestCaseName: `Validate Validation Rule - ${data.fullName}`,
                inputData: {
                    name: data.fullName
                },
                expectedOutput: {
                    active: data.active, errorConditionFormula: data.errorConditionFormula, errorMessage: data.errorMessage
                }
            }
        })
    }
}

module.exports = {
    buildAndWriteValidationRulesTests,
    getValidationRules
}