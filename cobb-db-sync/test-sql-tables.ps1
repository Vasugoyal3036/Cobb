$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName System.Data
    $connStr = "Server=localhost\SQLEXPRESS;Database=RPD_AVATAR01_NEW_ST_POS;Integrated Security=True;"
    $conn = New-Object System.Data.SqlClient.SqlConnection $connStr
    $conn.Open()
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND (TABLE_NAME LIKE '%Item%' OR TABLE_NAME LIKE '%Product%' OR TABLE_NAME LIKE '%Inv%' OR TABLE_NAME LIKE '%Stock%')"
    $reader = $cmd.ExecuteReader()
    
    while ($reader.Read()) {
        Write-Host "Found Table: $($reader['TABLE_NAME'])"
    }
    
    $conn.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
