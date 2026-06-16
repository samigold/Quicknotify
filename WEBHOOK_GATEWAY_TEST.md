# Test Webhook Integration with Gateway

## Prerequisites
- Services running: gateway, webhook-service, auth-service
- Valid JWT token from auth service

## Test Script

```powershell
# Set variables
$GATEWAY_URL = "http://localhost:3000"
$JWT_TOKEN = "YOUR_JWT_TOKEN_HERE"

# Helper function to make requests
function Invoke-WebhookAPI {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body,
        [string]$Token
    )
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    $url = "$GATEWAY_URL$Endpoint"
    
    if ($Body) {
        $Body = $Body | ConvertTo-Json
        $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $Body
    } else {
        $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers
    }
    
    return $response
}

# 1. Register a webhook
Write-Host "📝 Registering a webhook..." -ForegroundColor Green
$webhook = Invoke-WebhookAPI -Method POST -Endpoint "/api/webhooks" -Token $JWT_TOKEN -Body @{
    userId = "test_user_123"
    url = "https://webhook.site/unique-id-here"
    events = @("delivery.completed", "delivery.failed")
    secret = "test_secret_key_12345"
    active = $true
}
Write-Host $webhook | ConvertTo-Json -Depth 10
$webhookId = $webhook.webhook.id
Write-Host "✅ Webhook created with ID: $webhookId" -ForegroundColor Green

# 2. Get all webhooks for user
Write-Host "`n📋 Fetching all webhooks..." -ForegroundColor Green
$webhooks = Invoke-WebhookAPI -Method GET -Endpoint "/api/webhooks?userId=test_user_123" -Token $JWT_TOKEN
Write-Host "Found $($webhooks.count) webhooks" -ForegroundColor Green
Write-Host $webhooks | ConvertTo-Json -Depth 10

# 3. Get specific webhook
Write-Host "`n🔍 Fetching specific webhook..." -ForegroundColor Green
$webhook = Invoke-WebhookAPI -Method GET -Endpoint "/api/webhooks/$webhookId" -Token $JWT_TOKEN
Write-Host $webhook | ConvertTo-Json -Depth 10

# 4. Update webhook
Write-Host "`n✏️  Updating webhook..." -ForegroundColor Green
$updated = Invoke-WebhookAPI -Method PUT -Endpoint "/api/webhooks/$webhookId" -Token $JWT_TOKEN -Body @{
    url = "https://webhook.site/updated-endpoint"
    active = $true
    events = @("delivery.completed")
}
Write-Host $updated | ConvertTo-Json -Depth 10

# 5. Get webhook statistics
Write-Host "`n📊 Fetching webhook statistics..." -ForegroundColor Green
$stats = Invoke-WebhookAPI -Method GET -Endpoint "/api/webhooks/$webhookId/stats" -Token $JWT_TOKEN
Write-Host $stats | ConvertTo-Json

# 6. Get delivery logs
Write-Host "`n📝 Fetching delivery logs..." -ForegroundColor Green
$logs = Invoke-WebhookAPI -Method GET -Endpoint "/api/webhooks/$webhookId/logs?limit=10&offset=0" -Token $JWT_TOKEN
Write-Host $logs | ConvertTo-Json -Depth 10

# 7. Test webhook delivery
Write-Host "`n🧪 Testing webhook delivery..." -ForegroundColor Green
$test = Invoke-WebhookAPI -Method POST -Endpoint "/api/webhooks/$webhookId/test" -Token $JWT_TOKEN
Write-Host $test | ConvertTo-Json -Depth 10

# 8. Delete webhook
Write-Host "`n🗑️  Deleting webhook..." -ForegroundColor Green
$deleted = Invoke-WebhookAPI -Method DELETE -Endpoint "/api/webhooks/$webhookId" -Token $JWT_TOKEN
Write-Host $deleted | ConvertTo-Json

Write-Host "`n✅ All tests completed!" -ForegroundColor Green
```

## Manual Testing via Swagger UI

1. **Navigate to**: `http://localhost:3000/api-docs`
2. **Authorize**: Click the "Authorize" button and paste your JWT token
3. **Test Endpoints**:
   - Expand "Webhooks" section
   - Click "POST /api/webhooks" → "Try it out"
   - Enter sample data and execute
   - Verify responses

## Example JWT Token Request

```powershell
# Login to get token
$loginResponse = Invoke-RestMethod `
  -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{
    email = "test@example.com"
    password = "your_password"
  } | ConvertTo-Json)

$token = $loginResponse.token
Write-Host "JWT Token: $token"
```

## Curl Commands

```bash
# Get JWT token
TOKEN=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# Register webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "url": "https://webhook.site/your-unique-id",
    "events": ["delivery.completed"],
    "secret": "my_secret"
  }'

# List webhooks
curl -X GET "http://localhost:3000/api/webhooks?userId=user123" \
  -H "Authorization: Bearer $TOKEN"

# Get webhook stats
curl -X GET "http://localhost:3000/api/webhooks/{webhook_id}/stats" \
  -H "Authorization: Bearer $TOKEN"
```

## Expected Responses

### Successful Registration (201)
```json
{
  "message": "Webhook registered successfully",
  "webhook": {
    "id": "webhook_1",
    "userId": "test_user_123",
    "url": "https://webhook.site/unique-id-here",
    "events": ["delivery.completed", "delivery.failed"],
    "active": true,
    "createdAt": "2026-06-16T13:44:36.350Z",
    "updatedAt": "2026-06-16T13:44:36.350Z",
    "deliveryStats": {
      "totalDeliveries": 0,
      "successfulDeliveries": 0,
      "failedDeliveries": 0
    }
  }
}
```

### Successful List (200)
```json
{
  "count": 1,
  "webhooks": [
    {
      "id": "webhook_1",
      "userId": "test_user_123",
      "url": "https://webhook.site/unique-id-here",
      "events": ["delivery.completed", "delivery.failed"],
      "active": true,
      "createdAt": "2026-06-16T13:44:36.350Z",
      "updatedAt": "2026-06-16T13:44:36.350Z",
      "deliveryStats": {
        "totalDeliveries": 0,
        "successfulDeliveries": 0,
        "failedDeliveries": 0
      }
    }
  ]
}
```

## Troubleshooting

### "Unauthorized" Error
```
Check: JWT token is valid and includes Authorization header
```

### "Webhook not found"
```
Check: webhook_id is correct and belongs to your user
```

### CORS Issues
```
Should not occur as gateway is configured with changeOrigin: true
```

### Rate Limiting
```
If rate limited (429), wait 15 minutes and retry
```
