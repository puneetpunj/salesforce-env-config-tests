const Table = require('cli-table');
const emoji = require('node-emoji')
const path = require('path')
const _ = require('lodash')
const { readJSONSync } = require('fs-extra')
const configData = readJSONSync(path.resolve(__dirname, '../config.json'))
const objectList = configData.objectList[configData['baseOrg']]
const TICK = emoji.get('white_check_mark')
const CROSS = emoji.get('x')
const Headers = ['Object Name From Base Org']

const getColWidthsArray = destOrgs => {
    const cols = [30]
    destOrgs.map(i => cols.push(30))
    // cols.unshift(15)
    return cols
}

const getColAllignsArray = destOrgs => {
    const cols = []
    destOrgs.map(i => cols.push('middle'))
    cols.unshift('left')
    return cols
}

module.exports.printReportTable = () => {

    const destOrgs = configData.destinationOrgs
    destOrgs.forEach(i => Headers.push(i))
    const table = new Table({ head: Headers, style: { head: ['cyan'], }, colWidths: getColWidthsArray(destOrgs), colAligns: getColAllignsArray(destOrgs) });
    const detailedReport = readJSONSync(path.resolve(__dirname, '../execution-report/detailed-execution-report.json'))

    const suites = detailedReport.results[0].suites

    const allDestObjectStatus = getAllDestinationObjectStatus(suites, destOrgs)

    const testResults = getTestResults(destOrgs, allDestObjectStatus)

    const finalObjectList = getFinalObjectList(objectList, destOrgs, testResults)

    Object.keys(finalObjectList).forEach(i => table.push({ [i]: finalObjectList[i] }))
    console.log(table.toString());

    console.log(`
    ${CROSS}  -> Tests for Validation Rules and List of Values are all Passed.
    ${TICK}  -> Some of the Tests for either Validation Rules or List of Values are Failed. Check Detailed Report. 
    NA -> This object is not applicable for this Org based on config.json
    `)
}

const getAllDestinationObjectStatus = (suites, destOrgs) => {
    const allDestObjectStatus = {}
    for (let i = 0; i < destOrgs.length; i++) {

        const currentOrgSuite = suites.filter(suite => suite.title === `ORG -> ${destOrgs[i]}`)
        const orgSuites = currentOrgSuite[0].suites
        const allSuites = _.flatMap(orgSuites.map(categorySuites => {
            return categorySuites.suites.map(objectSuite => {
                const res = {}
                res[objectSuite.title] = objectSuite.failures.length
                return res
            })
        }))
        allDestObjectStatus[destOrgs[i]] = allSuites
    }
    return allDestObjectStatus
}

const getTestResults = (destOrgs, allDestObjectStatus) => {
    const checkObjectExist = (arr, obj) => {
        return arr.reduce((acc, i, index) => {
            const key = Object.keys(i)[0]
            return key.includes(obj) ? arr[index][key] > 0 ? CROSS : TICK : acc
        }, 'NA')
    }
    const testResults = objectList.reduce((acc, object) => {
        acc[object] = destOrgs.reduce((final, dest, index) => {
            final[index] = checkObjectExist(allDestObjectStatus[dest], object)
            return final
        }, [])
        return acc;
    }, {})
    return testResults;
}
const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);

const getFinalObjectList = (objectList, destOrgs, testResults) => {
    const finalObjectList = objectList.reduce((acc, i) => {
        acc[capitalizeFirstLetter(i)] = typeof (testResults[i]) === 'undefined' ? destOrgs.map(i => 'NA') : testResults[i]
        return acc;
    }, [])
    return finalObjectList
}