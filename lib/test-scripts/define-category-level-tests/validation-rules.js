const { getMetadataDetails } = require('../../salesforce/salesforce-interaction');
const { getValidationRules } = require('../../generate-tests-from-base-org/validation-rules');


const getValidationRulesMetadata = async (envName, objectName) => {
    const metadata = await getMetadataDetails(envName, objectName);
    return getValidationRules(metadata)
}

module.exports = { getValidationRulesMetadata }