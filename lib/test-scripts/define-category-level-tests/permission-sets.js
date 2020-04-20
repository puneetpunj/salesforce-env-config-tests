const { sendSalesforceQuery } = require('../../salesforce/salesforce-interaction')

module.exports.getPermissionSetsMetadata = async (envName, objectName) => {
    const query = `SELECT Id,PermissionsCreate,PermissionsDelete,PermissionsEdit,PermissionsModifyAllRecords,PermissionsRead,PermissionsViewAllRecords,SobjectType FROM ObjectPermissions where SobjectType IN ('${objectName}')`
    return await sendSalesforceQuery(envName, query)
}