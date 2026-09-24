const fs = require('fs');
const path = require('path');

// Load the AI-generated schema map (if it exists)
const schemaMapPath = path.join(__dirname, 'schema_map.json');
let schemaMap = null;

function loadSchemaMap() {
    try {
        if (fs.existsSync(schemaMapPath)) {
            schemaMap = JSON.parse(fs.readFileSync(schemaMapPath, 'utf8'));
            console.log("[QueryBuilder] SaaS Dynamic Schema Map loaded successfully.");
        }
    } catch (e) {
        console.error("Failed to load schema map:", e.message);
    }
}
loadSchemaMap();

/**
 * Generates the SQL query for fetching recent sales based on the user's specific POS database.
 * If no custom SaaS map exists, it falls back to your original Ginesys table (CMM01106).
 */
function buildRecentSalesQuery(limit = 100, dateClause = '') {
    if (schemaMap && schemaMap.salesTable) {
        // SaaS MODE: Dynamic Universal Query based on AI Schema Map
        const st = schemaMap.salesTable;
        return `
            SELECT TOP ${limit}
                ${st.billNumberColumn} as BillId,
                ${st.billNumberColumn} as BillNumber,
                ${st.customerPhoneColumn} as Phone,
                'Customer' as CustomerName,
                ${st.totalAmountColumn} as Amount,
                CONVERT(varchar, ${st.billDateColumn}, 126) as BillTime,
                CONVERT(varchar, ${st.billDateColumn}, 23) as BillDate
            FROM ${st.tableName}
            WHERE 1=1 ${dateClause ? `AND ${dateClause}` : ''}
            ORDER BY ${st.billDateColumn} DESC
        `;
    } else {
        // CLASSIC MODE: Your original Ginesys Code
        return `
            SELECT TOP ${limit} 
                m.CM_ID as BillId,
                m.CM_NO as BillNumber,
                m.CUSTOMER_CODE as Phone,
                ISNULL(c.CUSTOMER_FNAME, '') + ' ' + ISNULL(c.CUSTOMER_LNAME, '') as CustomerName,
                c.CUSTOMER_FNAME as FirstName,
                m.NET_AMOUNT as Amount,
                CONVERT(varchar, m.CM_TIME, 126) as BillTime,
                CONVERT(varchar, m.CM_TIME, 23) as BillDate
            FROM CMM01106 m WITH (NOLOCK)
            LEFT JOIN CUSTDYM c WITH (NOLOCK) ON m.CUSTOMER_CODE = c.CUSTOMER_CODE
            WHERE 1=1 ${dateClause ? `AND ${dateClause}` : ''} AND m.CANCELLED = 0
            ORDER BY m.CM_TIME DESC
        `;
    }
}

module.exports = { buildRecentSalesQuery, loadSchemaMap };
