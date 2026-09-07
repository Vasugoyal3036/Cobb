import pyodbc

available_drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
selected_driver = available_drivers[0]
for d in ['ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server', 'SQL Server']:
    if d in available_drivers:
        selected_driver = d
        break

conn_str = (
    f"Driver={{{selected_driver}}};"
    r"Server=DESKTOP-88CLSMJ\SQLEXPRESS;"
    "Database=RPD_AVATAR01_NEW_ST_POS;"
    "Trusted_Connection=yes;"
)
if '18' in selected_driver:
    conn_str += "TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 5 CM_ID, CM_NO, CM_TIME, CUSTOMER_FNAME, NET_AMOUNT FROM VW_CASHMEMO_PRINT_MST ORDER BY CM_TIME DESC")
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID: {row[0]}, NO: {row[1]}, Time: {row[2]}, Name: {row[3]}, Amt: {row[4]}")
except Exception as e:
    print(e)
