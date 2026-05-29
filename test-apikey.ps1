#!/usr/bin/env pwsh

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

$GATEWAY_URL = "http://localhost:3000"
$AUTH_URL = "http://localhost:3001"

Write-Host "${Blue}=== QuickNotify API Key Testing ===${Reset}`n"

# Step 1: Register a test user
Write-Host "${Yellow}[1] Registering new user...${Reset}"
$registerBody = @{
    email = "apikey-test@quicknotify.com"
    password = "TestPassword123"
} | ConvertTo-Json

$registerResponse = Invoke-WebRequest -Uri "$AUTH_URL/api/auth/register" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $registerBody `
    -ErrorAction SilentlyContinue

if ($registerResponse.StatusCode -eq 201) {
    Write-Host "${Green}✓ Registration successful${Reset}"
    $userId = ($registerResponse.Content | ConvertFrom-Json).userId
    Write-Host "  User ID: $userId`n"
} else {
    Write-Host "${Red}✗ Registration failed${Reset}"
    Write-Host "  Response: $($registerResponse.Content)`n"
    exit 1
}

# Step 2: Login to get JWT
Write-Host "${Yellow}[2] Logging in to get JWT token...${Reset}"
$loginBody = @{
    email = "apikey-test@quicknotify.com"
    password = "TestPassword123"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "$AUTH_URL/api/auth/login" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $loginBody `
    -ErrorAction SilentlyContinue

if ($loginResponse.StatusCode -eq 200) {
    Write-Host "${Green}✓ Login successful${Reset}"
    $jwtToken = ($loginResponse.Content | ConvertFrom-Json).token
    Write-Host "  JWT Token: $($jwtToken.Substring(0, 20))...${Reset}`n"
} else {
    Write-Host "${Red}✗ Login failed${Reset}"
    Write-Host "  Response: $($loginResponse.Content)`n"
    exit 1
}

# Step 3: Generate API Key
Write-Host "${Yellow}[3] Generating API Key...${Reset}"
$generateKeyResponse = Invoke-WebRequest -Uri "$AUTH_URL/api/auth/apikey/generate" `
    -Method POST `
    -Headers @{"Authorization" = "Bearer $jwtToken"} `
    -ErrorAction SilentlyContinue

if ($generateKeyResponse.StatusCode -eq 201) {
    Write-Host "${Green}✓ API Key generated successfully${Reset}"
    $apiKey = ($generateKeyResponse.Content | ConvertFrom-Json).apiKey
    Write-Host "  API Key: $($apiKey.Substring(0, 20))...${Reset}`n"
} else {
    Write-Host "${Red}✗ API Key generation failed${Reset}"
    Write-Host "  Status: $($generateKeyResponse.StatusCode)"
    Write-Host "  Response: $($generateKeyResponse.Content)`n"
    exit 1
}

# Step 4: Get API Key Info
Write-Host "${Yellow}[4] Fetching API Key info...${Reset}"
$keyInfoResponse = Invoke-WebRequest -Uri "$AUTH_URL/api/auth/apikey/info" `
    -Method GET `
    -Headers @{"Authorization" = "Bearer $jwtToken"} `
    -ErrorAction SilentlyContinue

if ($keyInfoResponse.StatusCode -eq 200) {
    Write-Host "${Green}✓ API Key info retrieved${Reset}"
    $keyInfo = $keyInfoResponse.Content | ConvertFrom-Json
    Write-Host "  Created At: $($keyInfo.createdAt)"
    Write-Host "  Key Prefix: $($keyInfo.keyPrefix)`n"
} else {
    Write-Host "${Red}✗ Failed to fetch API Key info${Reset}"
    Write-Host "  Response: $($keyInfoResponse.Content)`n"
}

# Step 5: Test API Key Authentication - Create Notification
Write-Host "${Yellow}[5] Testing API Key authentication - Creating notification...${Reset}"
$notificationBody = @{
    type = "email"
    recipient = "user@example.com"
    subject = "API Key Test"
    message = "Testing notification with API Key authentication"
} | ConvertTo-Json

$notificationResponse = Invoke-WebRequest -Uri "$GATEWAY_URL/api/notifications" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "X-API-Key" = $apiKey
    } `
    -Body $notificationBody `
    -ErrorAction SilentlyContinue

if ($notificationResponse.StatusCode -eq 201) {
    Write-Host "${Green}✓ Notification created with API Key authentication${Reset}"
    $notification = $notificationResponse.Content | ConvertFrom-Json
    Write-Host "  Notification ID: $($notification.notification._id)"
    Write-Host "  Status: $($notification.notification.status)`n"
} else {
    Write-Host "${Red}✗ Failed to create notification with API Key${Reset}"
    Write-Host "  Status: $($notificationResponse.StatusCode)"
    Write-Host "  Response: $($notificationResponse.Content)`n"
}

# Step 6: Test with JWT - Get Notifications
Write-Host "${Yellow}[6] Testing JWT authentication - Getting notifications...${Reset}"
$getNotifResponse = Invoke-WebRequest -Uri "$GATEWAY_URL/api/notifications" `
    -Method GET `
    -Headers @{"Authorization" = "Bearer $jwtToken"} `
    -ErrorAction SilentlyContinue

if ($getNotifResponse.StatusCode -eq 200) {
    Write-Host "${Green}✓ Retrieved notifications with JWT${Reset}"
    $notifications = $getNotifResponse.Content | ConvertFrom-Json
    Write-Host "  Total notifications: $($notifications.Length)`n"
} else {
    Write-Host "${Red}✗ Failed to retrieve notifications${Reset}"
    Write-Host "  Response: $($getNotifResponse.Content)`n"
}

# Step 7: Test with invalid API Key
Write-Host "${Yellow}[7] Testing with invalid API Key (should fail)...${Reset}"
$invalidKeyResponse = Invoke-WebRequest -Uri "$GATEWAY_URL/api/notifications" `
    -Method GET `
    -Headers @{"X-API-Key" = "invalid-key-12345"} `
    -ErrorAction SilentlyContinue

if ($invalidKeyResponse.StatusCode -eq 401) {
    Write-Host "${Green}✓ Correctly rejected invalid API Key${Reset}`n"
} else {
    Write-Host "${Red}✗ Unexpected response for invalid API Key${Reset}"
    Write-Host "  Status: $($invalidKeyResponse.StatusCode)`n"
}

# Step 8: Revoke API Key
Write-Host "${Yellow}[8] Revoking API Key...${Reset}"
$revokeResponse = Invoke-WebRequest -Uri "$AUTH_URL/api/auth/apikey/revoke" `
    -Method DELETE `
    -Headers @{"Authorization" = "Bearer $jwtToken"} `
    -ErrorAction SilentlyContinue

if ($revokeResponse.StatusCode -eq 200) {
    Write-Host "${Green}✓ API Key revoked successfully${Reset}`n"
} else {
    Write-Host "${Red}✗ Failed to revoke API Key${Reset}"
    Write-Host "  Response: $($revokeResponse.Content)`n"
}

# Step 9: Test revoked API Key (should fail)
Write-Host "${Yellow}[9] Testing revoked API Key (should fail)...${Reset}"
$revokedKeyResponse = Invoke-WebRequest -Uri "$GATEWAY_URL/api/notifications" `
    -Method GET `
    -Headers @{"X-API-Key" = $apiKey} `
    -ErrorAction SilentlyContinue

if ($revokedKeyResponse.StatusCode -eq 401) {
    Write-Host "${Green}✓ Correctly rejected revoked API Key${Reset}`n"
} else {
    Write-Host "${Red}✗ Revoked API Key still works (unexpected)${Reset}"
    Write-Host "  Status: $($revokedKeyResponse.StatusCode)`n"
}

Write-Host "${Green}=== All tests completed ===${Reset}"
