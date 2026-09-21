[CmdletBinding()]
param(
    [ValidateSet("Sandbox", "Live")]
    [string]$Environment = "Sandbox",
    [string]$ClientId = $env:PAYPAL_CLIENT_ID,
    [string]$ApiBaseUrl = ""
)

$ErrorActionPreference = "Stop"
$isLive = $Environment -eq "Live"
$paypalBaseUrl = if ($isLive) { "https://api-m.paypal.com" } else { "https://api-m.sandbox.paypal.com" }

function Get-PlainTextSecret {
    param([Security.SecureString]$SecureString)

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Invoke-PayPalGet {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$AccessToken
    )

    return Invoke-RestMethod -Method Get -Uri "$paypalBaseUrl$Path" -Headers @{
        Authorization = "Bearer $AccessToken"
        Accept        = "application/json"
    }
}

function Invoke-PayPalPost {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$AccessToken,
        [Parameter(Mandatory = $true)][object]$Body
    )

    $requestId = [Guid]::NewGuid().ToString("N")
    return Invoke-RestMethod -Method Post -Uri "$paypalBaseUrl$Path" -Headers @{
        Authorization       = "Bearer $AccessToken"
        Accept              = "application/json"
        "PayPal-Request-Id" = $requestId
        Prefer              = "return=representation"
    } -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 12)
}

function Get-OrCreateProduct {
    param([string]$AccessToken)

    $response = Invoke-PayPalGet -Path "/v1/catalogs/products?page_size=20&page=1&total_required=true" -AccessToken $AccessToken
    $existing = @($response.products) | Where-Object { $_.name -eq "BarberTrix" } | Select-Object -First 1
    if ($null -ne $existing) {
        Write-Host "Using existing product BarberTrix: $($existing.id)"
        return $existing
    }

    $product = Invoke-PayPalPost -Path "/v1/catalogs/products" -AccessToken $AccessToken -Body @{
        name        = "BarberTrix"
        description = "BarberTrix SaaS for barbershop queue, appointments, CRM, TV and operations."
        type        = "SERVICE"
    }
    Write-Host "Created product BarberTrix: $($product.id)"
    return $product
}

function Assert-ExistingPlanMatches {
    param(
        [string]$AccessToken,
        [object]$Plan,
        [string]$ProductId,
        [string]$Name,
        [string]$Price
    )

    $encodedPlanId = [Uri]::EscapeDataString($Plan.id)
    $detail = Invoke-PayPalGet -Path "/v1/billing/plans/$encodedPlanId" -AccessToken $AccessToken
    $regularCycle = @($detail.billing_cycles) | Where-Object { $_.tenure_type -eq "REGULAR" } | Select-Object -First 1

    if ($null -eq $regularCycle) {
        throw "Existing PayPal plan '$Name' has no REGULAR billing cycle. Refusing to reuse it."
    }

    $priceInfo = $regularCycle.pricing_scheme.fixed_price
    $expectedPrice = [decimal]::Parse($Price, [Globalization.CultureInfo]::InvariantCulture)
    $actualPrice = 0m
    if ($null -eq $priceInfo -or
        -not [decimal]::TryParse([string]$priceInfo.value, [Globalization.NumberStyles]::Number, [Globalization.CultureInfo]::InvariantCulture, [ref]$actualPrice)) {
        throw "Existing PayPal plan '$Name' has an unreadable price. Refusing to reuse it."
    }

    $matches =
        $detail.product_id -eq $ProductId -and
        $regularCycle.frequency.interval_unit -eq "MONTH" -and
        [int]$regularCycle.frequency.interval_count -eq 1 -and
        [string]$priceInfo.currency_code -eq "USD" -and
        $actualPrice -eq $expectedPrice

    if (-not $matches) {
        throw "Existing active PayPal plan '$Name' does not match the expected monthly USD $Price configuration. Refusing to reuse or silently replace it."
    }
}

function Get-OrCreatePlan {
    param(
        [string]$AccessToken,
        [string]$ProductId,
        [string]$Name,
        [string]$Description,
        [string]$Price
    )

    $encodedProductId = [Uri]::EscapeDataString($ProductId)
    $response = Invoke-PayPalGet -Path "/v1/billing/plans?product_id=$encodedProductId&page_size=20&page=1&total_required=true" -AccessToken $AccessToken
    $existing = @($response.plans) | Where-Object { $_.name -eq $Name -and $_.status -eq "ACTIVE" } | Select-Object -First 1
    if ($null -ne $existing) {
        Assert-ExistingPlanMatches -AccessToken $AccessToken -Plan $existing -ProductId $ProductId -Name $Name -Price $Price
        Write-Host "Using existing plan $($Name): $($existing.id)"
        return $existing
    }

    $plan = Invoke-PayPalPost -Path "/v1/billing/plans" -AccessToken $AccessToken -Body @{
        product_id  = $ProductId
        name        = $Name
        description = $Description
        billing_cycles = @(
            @{
                frequency = @{
                    interval_unit  = "MONTH"
                    interval_count = 1
                }
                tenure_type = "REGULAR"
                sequence    = 1
                total_cycles = 0
                pricing_scheme = @{
                    fixed_price = @{
                        value         = $Price
                        currency_code = "USD"
                    }
                }
            }
        )
        payment_preferences = @{
            auto_bill_outstanding     = $true
            payment_failure_threshold = 3
        }
    }

    Write-Host "Created plan $($Name): $($plan.id)"
    return $plan
}

function Get-OrCreateWebhook {
    param(
        [string]$AccessToken,
        [string]$BaseUrl
    )

    if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
        return $null
    }

    $uri = $null
    if (-not [Uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne "https") {
        throw "ApiBaseUrl must be a public HTTPS URL, for example https://api.example.com"
    }

    if ($uri.IsLoopback -or $uri.Host -eq "localhost") {
        throw "ApiBaseUrl must be publicly reachable by PayPal; localhost/loopback URLs are not allowed."
    }

    $webhookUrl = "$($BaseUrl.TrimEnd('/'))/api/webhooks/paypal"
    $response = Invoke-PayPalGet -Path "/v1/notifications/webhooks" -AccessToken $AccessToken
    $existing = @($response.webhooks) | Where-Object { $_.url -eq $webhookUrl } | Select-Object -First 1
    if ($null -ne $existing) {
        Write-Host "Using existing webhook: $($existing.id)"
        return $existing
    }

    $webhook = Invoke-PayPalPost -Path "/v1/notifications/webhooks" -AccessToken $AccessToken -Body @{
        url = $webhookUrl
        event_types = @(
            @{ name = "BILLING.SUBSCRIPTION.ACTIVATED" },
            @{ name = "BILLING.SUBSCRIPTION.CANCELLED" },
            @{ name = "BILLING.SUBSCRIPTION.SUSPENDED" },
            @{ name = "BILLING.SUBSCRIPTION.PAYMENT.FAILED" }
        )
    }

    Write-Host "Created webhook: $($webhook.id)"
    return $webhook
}

if ($isLive) {
    Write-Warning "You are about to create or reuse REAL PayPal Live catalog resources for BarberTrix."
    $confirmation = Read-Host "Type LIVE to continue"
    if ($confirmation -cne "LIVE") {
        throw "Live PayPal bootstrap cancelled."
    }
}

if ([string]::IsNullOrWhiteSpace($ClientId)) {
    $ClientId = Read-Host "PayPal $Environment Client ID"
}
if ([string]::IsNullOrWhiteSpace($ClientId)) {
    throw "A PayPal $Environment Client ID is required."
}

$secureSecret = Read-Host "PayPal $Environment Client Secret" -AsSecureString
$clientSecret = Get-PlainTextSecret -SecureString $secureSecret
if ([string]::IsNullOrWhiteSpace($clientSecret)) {
    throw "A PayPal $Environment Client Secret is required."
}

try {
    Write-Host "Authenticating with PayPal $Environment..."
    $basicBytes = [Text.Encoding]::UTF8.GetBytes("$($ClientId):$clientSecret")
    $basicToken = [Convert]::ToBase64String($basicBytes)
    $tokenResponse = Invoke-RestMethod -Method Post -Uri "$paypalBaseUrl/v1/oauth2/token" -Headers @{
        Authorization = "Basic $basicToken"
        Accept        = "application/json"
    } -ContentType "application/x-www-form-urlencoded" -Body @{ grant_type = "client_credentials" }

    $accessToken = $tokenResponse.access_token
    if ([string]::IsNullOrWhiteSpace($accessToken)) {
        throw "PayPal did not return an access token."
    }

    Write-Host "PayPal $Environment authentication succeeded."

    $product = Get-OrCreateProduct -AccessToken $accessToken
    $proPlan = Get-OrCreatePlan -AccessToken $accessToken -ProductId $product.id -Name "BarberTrix Pro" -Description "BarberTrix Pro monthly subscription" -Price "40.00"
    $businessPlan = Get-OrCreatePlan -AccessToken $accessToken -ProductId $product.id -Name "BarberTrix Business" -Description "BarberTrix Business monthly subscription" -Price "70.00"
    $webhook = Get-OrCreateWebhook -AccessToken $accessToken -BaseUrl $ApiBaseUrl

    Write-Host ""
    Write-Host "BarberTrix PayPal $Environment bootstrap complete." -ForegroundColor Green
    Write-Host "Product ID: $($product.id)"
    Write-Host "Pro plan ID: $($proPlan.id)"
    Write-Host "Business plan ID: $($businessPlan.id)"
    if ($null -ne $webhook) {
        Write-Host "Webhook ID: $($webhook.id)"
    }
    else {
        Write-Host "Webhook: not created yet (rerun with -ApiBaseUrl after a public HTTPS API URL exists)."
    }

    Write-Host ""
    Write-Host "Copy only the generated IDs to your environment configuration. Never commit the Client Secret."
    Write-Host "BARBERTRIX_PAYPAL_PRO_PLAN_ID=$($proPlan.id)"
    Write-Host "BARBERTRIX_PAYPAL_BUSINESS_PLAN_ID=$($businessPlan.id)"
    if ($null -ne $webhook) {
        Write-Host "BARBERTRIX_PAYPAL_WEBHOOK_ID=$($webhook.id)"
    }
}
finally {
    $clientSecret = $null
    $accessToken = $null
}
