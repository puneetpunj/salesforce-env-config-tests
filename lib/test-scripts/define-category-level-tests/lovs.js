const { suiteInstance, Test } = require('../../mocha-setup')
const { iterateTestsAndAddToMocha } = require('./common')
const reportValue = require('mochawesome/addContext')
const expect = require('chai').expect;

const defineLOVspecificTests = (testFileContent, testSuite, metadataDetails) => {
    Object.keys(testFileContent).filter(key => key !== 'TestSuiteName').forEach(recordType => {
        const createRecordTypeTestSuite = suiteInstance.create(testSuite, testFileContent[recordType].RecordTypeTestSuiteName);

        const recordTypeMetadata = metadataDetails[recordType]

        createRecordTypeTestSuite.addTest(new Test(`Validate Record Type "${recordType}" exist`, function () {
            reportValue(this, `Record Type metadata - ${recordTypeMetadata}`)
            expect(typeof (recordTypeMetadata)).to.not.equal('undefined', `It appears ${recordType} RecordType does not exist `)
        }))

        if (typeof (recordTypeMetadata) !== 'undefined') {
            iterateTestsAndAddToMocha(testFileContent[recordType], createRecordTypeTestSuite, metadataDetails[recordType], 'lovs')
        }

    })
}

module.exports = { defineLOVspecificTests }