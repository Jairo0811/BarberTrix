[CmdletBinding()]
param(
    [string]$ClientId = $env:PAYPAL_CLIENT_ID,
    [string]$ApiBaseUrl = ""
)

$arguments = @{
    Environment = "Sandbox"
    ClientId = $ClientId
    ApiBaseUrl = $ApiBaseUrl
}

& (Join-Path $PSScriptRoot "Initialize-BarberTrixPayPal.ps1") @arguments
