const { GoogleGenAI } = require('@google/genai');
const mssql = require('mssql/msnodesqlv8');
const mysql = require('mysql2/promise');
const { Client: PgClient } = require('pg');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // The backend needs the key!

/**
 * Connects to the given DB using the raw credentials, extracts the schema (table/column names),
 * and asks Gemini to map them to standard Cobb Retail CRM concepts.
 */
async function performAiSchemaMapping(config) {
    const { engine, host, port, database, username, password } = config;
    let schemaDump = "";

    try {
        console.log(`[AI Mapper] Connecting to ${engine} at ${host}...`);
        
        if (engine === 'mssql') {
            const pool = await mssql.connect({
                server: host,
                database: database,
                user: username,
                password: password,
                options: { trustServerCertificate: true }
            });
            const result = await pool.request().query(`
                SELECT TABLE_NAME, COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME NOT LIKE 'sys%'
            `);
            schemaDump = formatSchema(result.recordset);
            await pool.close();
            
        } else if (engine === 'mysql') {
            const connection = await mysql.createConnection({ host, port, user: username, password, database });
            const [rows] = await connection.execute(`
                SELECT TABLE_NAME, COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ?
            `, [database]);
            schemaDump = formatSchema(rows);
            await connection.end();
            
        } else if (engine === 'postgres') {
            const client = new PgClient({ host, port, user: username, password, database });
            await client.connect();
            const res = await client.query(`
                SELECT table_name as "TABLE_NAME", column_name as "COLUMN_NAME" 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
            `);
            schemaDump = formatSchema(res.rows);
            await client.end();
        }

        console.log(`[AI Mapper] Extracted schema (${schemaDump.length} bytes). Sending to Gemini...`);

        // Ask Gemini to map the schema
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a database architect for retail POS systems.
I have extracted the database schema from a user's custom Point of Sale software.
I am building a standardized CRM dashboard that needs to know which tables and columns to query.

Here is their raw schema:
${schemaDump.substring(0, 30000)} // truncate if massive

Map their schema to the following concepts. Return ONLY a valid JSON object matching this exact structure:
{
  "salesTable": {
    "tableName": "string",
    "billDateColumn": "string",
    "totalAmountColumn": "string",
    "customerPhoneColumn": "string",
    "billNumberColumn": "string"
  },
  "customerTable": {
    "tableName": "string",
    "phoneColumn": "string",
    "firstNameColumn": "string",
    "loyaltyPointsColumn": "string (optional, or null)"
  },
  "inventoryTable": {
    "tableName": "string",
    "itemCodeColumn": "string",
    "itemNameColumn": "string",
    "stockQtyColumn": "string",
    "priceColumn": "string"
  }
}

Do not use markdown blocks. Output pure JSON.`,
        });

        const mappingJson = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
        console.log("[AI Mapper] Successfully mapped schema!");
        return mappingJson;

    } catch (err) {
        console.error("[AI Mapper] Error:", err.message);
        throw err;
    }
}

function formatSchema(rows) {
    const tables = {};
    for (const row of rows) {
        const t = row.TABLE_NAME;
        const c = row.COLUMN_NAME;
        if (!tables[t]) tables[t] = [];
        tables[t].push(c);
    }
    
    let out = "";
    for (const [table, columns] of Object.entries(tables)) {
        out += `TABLE: ${table}\nCOLUMNS: ${columns.join(', ')}\n\n`;
    }
    return out;
}

module.exports = { performAiSchemaMapping };
