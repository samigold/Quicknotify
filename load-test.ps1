param(
    [int]$UserCount = 10,
    [string]$GatewayUrl = "https://tender-youthfulness-production-6712.up.railway.app"
)

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$results = @()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  QuickNotify Load Test" -ForegroundColor Cyan
Write-Host "  Users: $UserCount" -ForegroundColor Cyan
Write-Host "  Gateway: $GatewayUrl" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Register all users simultaneously ──
Write-Host "[ STEP 1 ] Registering $UserCount users simultaneously..." -ForegroundColor Yellow

$registerJobs = 1..$UserCount | ForEach-Object {
    $userId = $_
    $email = "loadtest_user${userId}_${timestamp}@quicknotify.com"
    $password = "Password123!"

    Start-Job -ScriptBlock {
        param($url, $email, $password, $userId)
        try {
            $body = @{ email = $email; password = $password } | ConvertTo-Json
            $response = Invoke-RestMethod -Uri "$url/api/auth/register" `
                -Method POST `
                -ContentType "application/json" `
                -Body $body
            [PSCustomObject]@{
                UserId   = $userId
                Email    = $email
                Password = $password
                Status   = "registered"
                Id       = $response.userId
            }
        } catch {
            [PSCustomObject]@{
                UserId   = $userId
                Email    = $email
                Password = $password
                Status   = "register_failed"
                Error    = $_.Exception.Message
            }
        }
    } -ArgumentList $GatewayUrl, $email, $password, $userId
}

$registerResults = $registerJobs | Wait-Job | Receive-Job
$registerJobs | Remove-Job

$registered = $registerResults | Where-Object { $_.Status -eq "registered" }
$registerFailed = $registerResults | Where-Object { $_.Status -eq "register_failed" }

Write-Host "  ✅ Registered: $($registered.Count)/$UserCount" -ForegroundColor Green
if ($registerFailed.Count -gt 0) {
    Write-Host "  ❌ Failed: $($registerFailed.Count)/$UserCount" -ForegroundColor Red
}

# ── Step 2: Login all users simultaneously ──
Write-Host ""
Write-Host "[ STEP 2 ] Logging in $($registered.Count) users simultaneously..." -ForegroundColor Yellow

$loginJobs = $registered | ForEach-Object {
    $user = $_
    Start-Job -ScriptBlock {
        param($url, $user)
        try {
            $body = @{ email = $user.Email; password = $user.Password } | ConvertTo-Json
            $response = Invoke-RestMethod -Uri "$url/api/auth/login" `
                -Method POST `
                -ContentType "application/json" `
                -Body $body
            [PSCustomObject]@{
                UserId = $user.UserId
                Email  = $user.Email
                Token  = $response.token
                Status = "logged_in"
            }
        } catch {
            [PSCustomObject]@{
                UserId = $user.UserId
                Email  = $user.Email
                Token  = $null
                Status = "login_failed"
                Error  = $_.Exception.Message
            }
        }
    } -ArgumentList $GatewayUrl, $user
}

$loginResults = $loginJobs | Wait-Job | Receive-Job
$loginJobs | Remove-Job

$loggedIn = $loginResults | Where-Object { $_.Status -eq "logged_in" }
$loginFailed = $loginResults | Where-Object { $_.Status -eq "login_failed" }

Write-Host "  ✅ Logged in: $($loggedIn.Count)/$($registered.Count)" -ForegroundColor Green
if ($loginFailed.Count -gt 0) {
    Write-Host "  ❌ Failed: $($loginFailed.Count)/$($registered.Count)" -ForegroundColor Red
}

# ── Step 3: Send notifications simultaneously ──
Write-Host ""
Write-Host "[ STEP 3 ] Sending notifications for $($loggedIn.Count) users simultaneously..." -ForegroundColor Yellow

$notificationTypes = @("email", "sms", "in-app")
$subjects = @("Welcome to QuickNotify!", "Your account is ready", "Load test notification", "System alert", "Test message")
$messages = @(
    "This is a load test notification from QuickNotify.",
    "Your microservices platform is handling real traffic!",
    "Event-driven architecture working perfectly.",
    "RabbitMQ message queued successfully.",
    "Prometheus is tracking this request right now."
)

$notificationJobs = $loggedIn | ForEach-Object {
    $user = $_
    Start-Job -ScriptBlock {
        param($url, $user, $types, $subjects, $messages)

        $results = @()

        # Each user sends 3 notifications (one per type)
        foreach ($type in $types) {
            try {
                $subject = $subjects | Get-Random
                $message = $messages | Get-Random
                $recipient = if ($type -eq "email") { $user.Email }
                             elseif ($type -eq "sms") { "+234801234567$($user.UserId)" }
                             else { "user_$($user.UserId)" }

                $body = @{
                    type      = $type
                    recipient = $recipient
                    subject   = $subject
                    message   = $message
                } | ConvertTo-Json

                $response = Invoke-RestMethod -Uri "$url/api/notifications" `
                    -Method POST `
                    -ContentType "application/json" `
                    -Headers @{ Authorization = "Bearer $($user.Token)" } `
                    -Body $body

                $results += [PSCustomObject]@{
                    UserId         = $user.UserId
                    Type           = $type
                    NotificationId = $response.notification._id
                    Status         = "queued"
                }
            } catch {
                $results += [PSCustomObject]@{
                    UserId = $user.UserId
                    Type   = $type
                    Status = "failed"
                    Error  = $_.Exception.Message
                }
            }
        }
        return $results
    } -ArgumentList $GatewayUrl, $user, $notificationTypes, $subjects, $messages
}

$notificationResults = $notificationJobs | Wait-Job | Receive-Job
$notificationJobs | Remove-Job

$queued = $notificationResults | Where-Object { $_.Status -eq "queued" }
$notifFailed = $notificationResults | Where-Object { $_.Status -eq "failed" }

Write-Host "  ✅ Notifications queued: $($queued.Count)" -ForegroundColor Green
if ($notifFailed.Count -gt 0) {
    Write-Host "  ❌ Failed: $($notifFailed.Count)" -ForegroundColor Red
}

# ── Summary ──
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LOAD TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Users registered:       $($registered.Count)/$UserCount" -ForegroundColor White
Write-Host "  Users logged in:        $($loggedIn.Count)/$UserCount" -ForegroundColor White
Write-Host "  Notifications queued:   $($queued.Count) ($(($loggedIn.Count * 3))) expected)" -ForegroundColor White
Write-Host ""
Write-Host "  Breakdown by type:" -ForegroundColor White
$queued | Group-Object Type | ForEach-Object {
    Write-Host "    $($_.Name): $($_.Count)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Check Grafana at http://localhost:3030" -ForegroundColor Cyan
Write-Host "  Check RabbitMQ at http://localhost:15672" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""