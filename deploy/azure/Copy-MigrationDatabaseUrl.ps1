# Run locally. Prompts for the selected database user's existing password,
# URL-encodes it, and copies the verified-TLS URL to the clipboard. No Azure calls.
[CmdletBinding()]
param(
    [ValidateSet('rooted_admin', 'gather_runtime')]
    [string]$DatabaseUser = 'rooted_admin'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$securePassword = Read-Host "Enter the existing $DatabaseUser PostgreSQL password" -AsSecureString
$passwordHandle = [IntPtr]::Zero
$plainPassword = $null
$encodedPassword = $null
$databaseUrl = $null
try {
    if ($securePassword.Length -eq 0) { throw 'The database password must not be empty.' }
    $passwordHandle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordHandle)
    $encodedPassword = [Uri]::EscapeDataString($plainPassword)
    $databaseUrl = 'postgresql://' + $DatabaseUser + ':' + $encodedPassword + '@rooted-postgres-centralus.postgres.database.azure.com:5432/rooted?sslmode=verify-full'
    Set-Clipboard -Value $databaseUrl
    if ($DatabaseUser -eq 'gather_runtime') {
        Write-Host 'Runtime URL copied to the clipboard. Paste it into the API/worker runtime-db-url secret.'
    } else {
        Write-Host 'Migration URL copied to the clipboard. Paste it into the migration-db-url job secret.'
    }
    Write-Host 'The URL was not printed, saved to a file, or sent to Azure by this helper.'
}
finally {
    if ($passwordHandle -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordHandle)
    }
    $securePassword.Dispose()
    $plainPassword = $null
    $encodedPassword = $null
    $databaseUrl = $null
}
