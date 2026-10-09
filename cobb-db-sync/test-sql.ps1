$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName System.Data
    $connStr = "Server=localhost\SQLEXPRESS;Integrated Security=True;"
    $conn = New-Object System.Data.SqlClient.SqlConnection $connStr
    $conn.Open()
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT name FROM sys.databases WHERE database_id > 4"
    $reader = $cmd.ExecuteReader()
    
    Write-Host "Connected to MS SQL successfully via Native Protocol!"
    while ($reader.Read()) {
        Write-Host "Found Database: $($reader['name'])"
    }
    
    $conn.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
