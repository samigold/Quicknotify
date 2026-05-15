# Delivery Service Testing Guide

## Overview

The Delivery Service has comprehensive unit and integration tests covering:

- **DeliveryServiceTest** — Tests notification processing logic
- **NotificationConsumerTest** — Tests RabbitMQ message consumption
- **DeliveryServiceApplicationTests** — Integration tests with containers

## Running Tests

### Prerequisites

Ensure you have Java 21+ and Maven 3.9+ installed:

```bash
java -version
mvn -version
```

### Run All Tests

```bash
cd c:\Users\Talktech\Desktop\quicknotify\delivery-service
mvn test
```

### Run Specific Test Class

```bash
# Test DeliveryService logic
mvn test -Dtest=DeliveryServiceTest

# Test RabbitMQ Consumer
mvn test -Dtest=NotificationConsumerTest

# Test Application Integration
mvn test -Dtest=DeliveryServiceApplicationTests
```

### Run Tests with Coverage Report

```bash
mvn clean test
mvn jacoco:report
# Report generated at: target/site/jacoco/index.html
```

### Run Tests in Watch Mode

For development with auto-rerun on file changes:

```bash
mvn watch
```

---

## Test Breakdown

### 1. DeliveryServiceTest (8 tests)

Tests the core delivery logic:

```
✓ testProcessNotificationSuccess — Email delivery
✓ testProcessNotificationWithSMS — SMS delivery
✓ testProcessNotificationWithPush — Push notification delivery
✓ testProcessNotificationSavesToMongoDB — Database persistence
✓ testProcessNotificationWithAllFields — Complete message handling
✓ testProcessNotificationRecordsTimestamp — Timestamp accuracy
✓ testProcessMultipleNotifications — Batch processing
```

**What it tests:**
- Message processing for all notification types
- MongoDB persistence
- Status tracking (delivered/failed)
- Timestamp recording
- Error handling

---

### 2. NotificationConsumerTest (10 tests)

Tests RabbitMQ message consumption:

```
✓ testConsumeValidEmailMessage — Valid email consumption
✓ testConsumeValidSmsMessage — Valid SMS consumption
✓ testConsumeValidPushMessage — Valid push consumption
✓ testConsumeInvalidJsonMessage — Invalid JSON handling
✓ testConsumeEmptyMessage — Empty message handling
✓ testConsumeNullBodyMessage — Null body handling
✓ testConsumeMultipleMessages — Batch message consumption
✓ testConsumeMessageWithAllFields — Complete message handling
✓ testConsumeCallsDeliveryServiceOnce — Idempotency
✓ testConsumerIsNotNullAfterInit — Initialization verification
```

**What it tests:**
- Message deserialization
- Error resilience (invalid JSON, empty messages)
- Proper delegation to DeliveryService
- RabbitListener functionality

---

### 3. DeliveryServiceApplicationTests (5 tests)

Integration tests with live containers:

```
✓ contextLoads — Application starts successfully
✓ testApplicationStarts — Beans initialized
✓ testDeliveryLogCanBeSaved — MongoDB integration
✓ testRabbitTemplateIsAvailable — RabbitMQ integration
✓ testMongoTemplateIsAvailable — Spring Data MongoDB integration
```

**What it tests:**
- Application context loads
- RabbitMQ connection
- MongoDB connection
- Full integration with containers

---

## Test Structure

```
DeliveryService (Business Logic)
    ↑
    ├─ DeliveryServiceTest (Unit Tests)
    │
    └─ NotificationConsumer (RabbitMQ Listener)
        ├─ NotificationConsumerTest (Unit Tests)
        │
        └─ DeliveryServiceApplicationTests (Integration Tests)
```

---

## Mocking Strategy

### Unit Tests (DeliveryServiceTest, NotificationConsumerTest)
- Mock `MongoTemplate`
- Mock `DeliveryService`
- No external dependencies needed
- Fast execution (~1-2 seconds)

### Integration Tests (DeliveryServiceApplicationTests)
- Use **Testcontainers** for real MongoDB/RabbitMQ
- Real Spring context
- Slower (~5-10 seconds)
- More realistic testing

---

## Expected Output

Successful test run:

```
[INFO] --- maven-surefire-plugin:3.0.0-M9:test (default-test) @ delivery-service ---
[INFO] 
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.quicknotify.delivery_service.service.DeliveryServiceTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.234 s - in com.quicknotify.delivery_service.service.DeliveryServiceTest
[INFO] Running com.quicknotify.delivery_service.consumer.NotificationConsumerTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.987 s - in com.quicknotify.delivery_service.consumer.NotificationConsumerTest
[INFO] Running com.quicknotify.delivery_service.DeliveryServiceApplicationTests
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 8.456 s - in com.quicknotify.delivery_service.DeliveryServiceApplicationTests
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 23, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] -------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] -------------------------------------------------------
```

---

## Debugging Tests

### View Test Output

```bash
mvn test -X
```

### Run Single Test with Debug

```bash
mvn test -Dtest=DeliveryServiceTest#testProcessNotificationSuccess
```

### Skip Tests During Build

```bash
mvn clean package -DskipTests
```

---

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Run Java Tests
  run: mvn clean test
  
- name: Generate Coverage Report
  run: mvn jacoco:report
```

---

## Troubleshooting

### Tests timeout with Testcontainers

Increase timeout in `DeliveryServiceApplicationTests`:
```java
@SpringBootTest(properties = "server.servlet.session.timeout=30m")
```

### Docker not available

Skip integration tests:
```bash
mvn test -Dtest=DeliveryServiceTest,NotificationConsumerTest
```

### MongoDB connection failed

Ensure MongoDB Docker container is running or Testcontainers can download it.

---

## Coverage Goals

Target test coverage:
- **DeliveryService:** 90%+
- **NotificationConsumer:** 85%+
- **Overall:** 85%+

Check coverage:
```bash
mvn jacoco:report
open target/site/jacoco/index.html
```

---

## What's Tested

✅ Message processing for email, SMS, push
✅ MongoDB persistence
✅ RabbitMQ consumption
✅ Error handling
✅ Timestamp recording
✅ Multiple notification types
✅ Invalid message handling
✅ Application startup
✅ Bean initialization
✅ Integration with containers

---

## Total Test Count: 23 Tests ✅
