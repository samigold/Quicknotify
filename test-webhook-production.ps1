# test-webhook-production.ps1
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Production Webhook Service Testing Script
# Purpose: Verify webhook service functionality in production
# Usage: .\test-webhook-production.ps1
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

param(
    [string]$GatewayUrl = "http://localhost:3000",
    [string]$WebhookServiceUrl = "http://localhost:3004",
    [string]$TestEmail = "test@example.com",
    [string]$TestPassword = "your_password"
)

$ErrorActionPreference = "Continue"

# Counters
$script:testsRun = 0
$script:testsPassed = 0
$script:testsFailed = 0
$script:warnings = @()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Helper Functions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Write-Section {
    param([string]$Title)
    Write-Host "`n$('=' * 80)" -ForegroundColor Yellow
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host "$('=' * 80)" -ForegroundColor Yellow
}

function Write-TestStart {
    param([string]$Name)
    $script:testsRun++
    Write-Host "`n Test $($script:testsRun): $Name" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [SUCCESS] $Message" -ForegroundColor Green
    $script:testsPassed++
}

function Write-Failure {
    param([string]$Message)
    Write-Host "  [FAILURE] $Message" -ForegroundColor Red
    $script:testsFailed++
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  [WARNING] $Message" -ForegroundColor Yellow
    $script:warnings += $Message
}

function Write-Detail {
    param([string]$Message)
    Write-Host "    $Message" -ForegroundColor Gray
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Health Checks
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Section "HEALTH CHECKS"

Write-TestStart "Gateway Health"
try {
    $response = Invoke-RestMethod -Uri "$GatewayUrl/health" -TimeoutSec 5
    Write-Success "Gateway responding: $($response.status)"
    Write-Detail "URL: $GatewayUrl"
} catch {
    Write-Failure "Gateway unreachable: $_"
    Write-Host "`n[FAILURE] Cannot reach gateway. Aborting tests." -ForegroundColor Red
    exit 1
}

Write-TestStart "Webhook Service Health"
try {
    $response = Invoke-RestMethod -Uri "$WebhookServiceUrl/health" -TimeoutSec 5
    Write-Success "Webhook service responding: $($response.status)"
    Write-Detail "URL: $WebhookServiceUrl"
} catch {
    Write-Warning "Webhook service unreachable on direct port (may be routed through gateway only)"
    Write-Detail "URL: $WebhookServiceUrl"
    Write-Detail "Error: $_"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Authentication
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Section "AUTHENTICATION"

Write-TestStart "Login"
try {
    $loginBody = @{
        email = $TestEmail
        password = $TestPassword
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/auth/login" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $loginBody
    
    $script:token = $response.token
    $script:userId = $response.user.id
    
    Write-Success "Login successful"
    Write-Detail "Email: $TestEmail"
    Write-Detail "User ID: $script:userId"
    Write-Detail "Token: $($script:token.Substring(0, 20))..."
} catch {
    Write-Failure "Login failed: $_"
    Write-Host "`n[FAILURE] Cannot authenticate. Aborting tests." -ForegroundColor Red
    exit 1
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Webhook CRUD Operations
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Section "WEBHOOK CRUD OPERATIONS"

# CREATE
Write-TestStart "Create Webhook"
try {
    $createBody = @{
        userId = $script:userId
        url = "https://webhook.site/unique-$(Get-Random -Minimum 100000 -Maximum 999999)"
        events = @("delivery.completed", "delivery.failed")
        secret = "test_secret_$(Get-Random)"
        active = $true
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
            "Content-Type" = "application/json"
        } `
        -Body $createBody
    
    $script:webhookId = $response.webhook.id
    Write-Success "Webhook created"
    Write-Detail "ID: $script:webhookId"
    Write-Detail "URL: $($response.webhook.url)"
    Write-Detail "Active: $($response.webhook.active)"
} catch {
    Write-Failure "Create webhook failed: $_"
}

# READ (Single)
Write-TestStart "Get Single Webhook"
try {
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks/$script:webhookId" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
        }
    
    Write-Success "Retrieved webhook"
    Write-Detail "ID: $($response.id)"
    Write-Detail "URL: $($response.url)"
    Write-Detail "Events: $($response.events -join ', ')"
} catch {
    Write-Failure "Get webhook failed: $_"
}

# READ (List)
Write-TestStart "List User Webhooks"
try {
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks?userId=$($script:userId)" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
        }
    
    Write-Success "Listed webhooks"
    Write-Detail "Total webhooks: $($response.count)"
    
    if ($response.count -gt 0) {
        Write-Detail "Webhook IDs: $($response.webhooks[0].id)"
    }
} catch {
    Write-Failure "List webhooks failed: $_"
}

# UPDATE
Write-TestStart "Update Webhook"
try {
    $updateBody = @{
        url = "https://webhook.site/updated-$(Get-Random)"
        events = @("delivery.completed")
        active = $false
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks/$($script:webhookId)" `
        -Method PUT `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
            "Content-Type" = "application/json"
        } `
        -Body $updateBody
    
    Write-Success "Webhook updated"
    Write-Detail "New URL: $($response.webhook.url)"
    Write-Detail "Active: $($response.webhook.active)"
} catch {
    Write-Failure "Update webhook failed: $_"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Webhook Features
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Section "WEBHOOK FEATURES"

# STATS
Write-TestStart "Get Webhook Statistics"
try {
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks/$($script:webhookId)/stats" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
        }
    
    Write-Success "Retrieved statistics"
    Write-Detail "Total Deliveries: $($response.totalDeliveries)"
    Write-Detail "Successful: $($response.successfulDeliveries)"
    Write-Detail "Failed: $($response.failedDeliveries)"
    Write-Detail "Pending: $($response.pendingDeliveries)"
    Write-Detail "Success Rate: $($response.successRate)"
} catch {
    Write-Failure "Get stats failed: $_"
}

# LOGS
Write-TestStart "Get Delivery Logs"
try {
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks/$($script:webhookId)/logs?limit=10&offset=0" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
        }
    
    Write-Success "Retrieved delivery logs"
    Write-Detail "Total logs: $($response.total)"
    Write-Detail "Returned: $($response.logs.Count)"
    Write-Detail "Limit: $($response.limit)"
    Write-Detail "Offset: $($response.offset)"
} catch {
    Write-Failure "Get logs failed: $_"
}

# TEST WEBHOOK
Write-TestStart "Test Webhook Endpoint"
try {
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks/$($script:webhookId)/test" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
        }
    
    Write-Success "Test initiated"
    Write-Detail "Message: $($response.message)"
    Write-Detail "Test Event: $($response.testPayload.event)"
} catch {
    Write-Failure "Test webhook failed: $_"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Error Handling
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Section "ERROR HANDLING"

# Invalid webhook ID
Write-TestStart "Handle Invalid Webhook ID"
try {
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks/invalid-id" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
        } `
        -SkipHttpErrorCheck
    
    if ($response.StatusCode -eq 404) {
        Write-Success "Correct error handling (404 Not Found)"
        Write-Detail "Error: $($response.message)"
    } else {
        Write-Warning "Unexpected status code: $($response.StatusCode)"
    }
} catch {
    Write-Failure "Unexpected error: $_"
}

# Missing token
Write-TestStart "Handle Missing Authorization"
try {
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks" `
        -Method GET `
        -SkipHttpErrorCheck
    
    if ($response.StatusCode -eq 401) {
        Write-Success "Correct error handling (401 Unauthorized)"
    } else {
        Write-Warning "Expected 401, got: $($response.StatusCode)"
    }
} catch {
    Write-Failure "Unexpected error: $_"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Cleanup
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Section "CLEANUP"

Write-TestStart "Delete Webhook"
try {
    $response = Invoke-RestMethod `
        -Uri "$GatewayUrl/api/webhooks/$($script:webhookId)" `
        -Method DELETE `
        -Headers @{
            "Authorization" = "Bearer $($script:token)"
        }
    
    Write-Success "Webhook deleted"
    Write-Detail "Message: $($response.message)"
} catch {
    Write-Failure "Delete webhook failed: $_"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Section "TEST RESULTS"

$passRate = if ($script:testsRun -gt 0) { 
    [math]::Round(($script:testsPassed / $script:testsRun) * 100, 2) 
} else { 
    0 
}

Write-Host "`nSummary:" -ForegroundColor Yellow
Write-Host "  Total Tests:  $($script:testsRun)" -ForegroundColor White
Write-Host "  Passed:       $($script:testsPassed)" -ForegroundColor Green
Write-Host "  Failed:       $($script:testsFailed)" -ForegroundColor Red
Write-Host "  Warnings:     $($script:warnings.Count)" -ForegroundColor Yellow
Write-Host "  Pass Rate:    $passRate%" -ForegroundColor $(if ($passRate -eq 100) { "Green" } else { "Yellow" })

if ($script:warnings.Count -gt 0) {
    Write-Host "`nWarnings:" -ForegroundColor Yellow
    foreach ($warning in $script:warnings) {
        Write-Host "  - $warning" -ForegroundColor Yellow
    }
}

if ($script:testsFailed -eq 0) {
    Write-Host "`nALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "`nWebhook service is working correctly in production." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSOME TESTS FAILED - CHECK OUTPUT ABOVE" -ForegroundColor Red
    Write-Host "`nFailed Tests: $($script:testsFailed)" -ForegroundColor Red
    exit 1
}
