# Webhook Database Integration - Implementation Checklist

## Phase 1: Setup & Configuration ✓

### Database Setup
- [ ] Verify PostgreSQL connection string in both auth-service and webhook-service
- [ ] Ensure both services can connect to same database
- [ ] Run migrations for WebhookEndpoint and WebhookLog tables (already exist in auth-service)

### Environment Variables
- [ ] Add to webhook-service/.env:
  ```env
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=quicknotify
  DB_USER=postgres
  DB_PASSWORD=postgres
  NODE_ENV=development
  ```

### Dependencies
- [ ] Verify `sequelize` installed in webhook-service
- [ ] Verify `pg` (PostgreSQL driver) installed
- [ ] Check package.json has required dependencies

```bash
cd webhook-service
npm install sequelize pg pg-hstore
```

---

## Phase 2: Model Integration ✓

### Import Models
- [ ] Verify webhook controller imports models correctly:
  ```javascript
  const { WebhookEndpoint, WebhookLog } = require('../../auth-service/src/models');
  ```

### Validate Model Compatibility
- [ ] Check WebhookEndpoint has fields:
  - `id` (UUID primary key)
  - `url` (string)
  - `secret` (text)
  - `subscribedEvents` (array)
  - `isEnabled` (boolean)
  - `UserId` (foreign key)
  - `createdAt`, `updatedAt` (timestamps)

- [ ] Check WebhookLog has fields:
  - `id` (UUID primary key)
  - `eventId` (string)
  - `statusCode` (integer)
  - `requestPayload` (JSONB)
  - `responseBody` (text)
  - `deliveryStatus` (enum: SUCCESS, FAILED, PENDING)
  - `WebhookEndpointId` (foreign key)
  - `createdAt`, `updatedAt` (timestamps)

---

## Phase 3: Database Queries ✓

### Create Webhook
- [ ] Test: `WebhookEndpoint.create()` with all fields
- [ ] Verify: UUID auto-generated
- [ ] Verify: Timestamps auto-set
- [ ] Test: Secret encryption (if applicable)

### Read Webhooks
- [ ] Test: `WebhookEndpoint.findAll({ where: { UserId } })`
- [ ] Test: `WebhookEndpoint.findByPk(id)`
- [ ] Test: Null handling for non-existent records

### Update Webhook
- [ ] Test: Partial update with `.save()`
- [ ] Test: URL validation before save
- [ ] Test: Events validation before save
- [ ] Verify: `updatedAt` timestamp updates

### Delete Webhook
- [ ] Test: `webhook.destroy()`
- [ ] Verify: Cascading delete to WebhookLog records
- [ ] Verify: No orphaned logs remain

### Read Logs
- [ ] Test: `WebhookLog.findAndCountAll()` with pagination
- [ ] Test: `.limit()` and `.offset()` parameters
- [ ] Test: `.order()` by createdAt DESC

### Aggregate Stats
- [ ] Test: Filter logs by deliveryStatus
- [ ] Test: Count SUCCESS, FAILED, PENDING
- [ ] Test: Calculate success rate percentage

---

## Phase 4: Testing ✓

### Unit Tests
- [ ] Update `__tests__/unit/webhookController.test.js` to mock database models
- [ ] Test: `registerWebhook()` with valid/invalid data
- [ ] Test: `getWebhooks()` returns user's webhooks
- [ ] Test: `updateWebhook()` validates URL and events
- [ ] Test: `deleteWebhook()` cascades deletes
- [ ] Test: `getWebhookLogs()` with pagination
- [ ] Test: `getWebhookStats()` calculates correctly

### Integration Tests
- [ ] Create `__tests__/integration/webhookDatabase.integration.test.js`
- [ ] Use test database (separate from production)
- [ ] Create test user and webhooks
- [ ] Verify CRUD operations work end-to-end
- [ ] Verify log persistence
- [ ] Verify cascading deletes

### Manual Testing
- [ ] POST /api/webhooks - Create webhook via gateway
- [ ] GET /api/webhooks?userId=X - List user webhooks
- [ ] GET /api/webhooks/{id} - Get specific webhook
- [ ] PUT /api/webhooks/{id} - Update webhook
- [ ] DELETE /api/webhooks/{id} - Delete webhook
- [ ] GET /api/webhooks/{id}/logs - View delivery logs
- [ ] GET /api/webhooks/{id}/stats - View statistics

---

## Phase 5: Error Handling ✓

### Validation Errors
- [ ] Return 400 for invalid URL format
- [ ] Return 400 for invalid events
- [ ] Return 400 for missing required fields
- [ ] Return 400 for invalid userId

### Not Found Errors
- [ ] Return 404 when webhook doesn't exist
- [ ] Return 404 when user has no webhooks (return count: 0 instead)

### Database Errors
- [ ] Handle connection errors gracefully
- [ ] Log database errors
- [ ] Return 500 for unexpected errors
- [ ] Don't expose internal error details to client

### Duplicate Prevention
- [ ] Allow multiple webhooks per user (not prevented at DB level)
- [ ] Allow duplicate URLs if for different users
- [ ] Check if duplicate prevention needed (business logic)

---

## Phase 6: Performance Optimization ✓

### Database Indexes
- [ ] Verify indexes exist for:
  - `WebhookEndpoint.UserId` (frequently filtered)
  - `WebhookLog.WebhookEndpointId` (frequently joined)
  - `WebhookLog.createdAt` (frequently sorted)

```sql
CREATE INDEX idx_webhook_endpoint_user_id ON "WebhookEndpoints"("UserId");
CREATE INDEX idx_webhook_log_endpoint_id ON "WebhookLogs"("WebhookEndpointId");
CREATE INDEX idx_webhook_log_created_at ON "WebhookLogs"("createdAt" DESC);
```

### Query Optimization
- [ ] Use `.findByPk()` for single record lookups
- [ ] Use `.findAll()` with where clause for filtering
- [ ] Implement pagination for log queries (default limit: 50)
- [ ] Consider caching frequently accessed webhooks

### N+1 Query Prevention
- [ ] Don't query logs for each webhook in a loop
- [ ] Use batch queries or aggregation
- [ ] Test query count with database logs enabled

---

## Phase 7: Security ✓

### Authorization
- [ ] Verify gateway enforces authentication before routing
- [ ] Verify users can only access their own webhooks
- [ ] Add userId check in controller if needed

### Secret Encryption
- [ ] Verify webhook secret is encrypted in database
- [ ] Never log secrets in plaintext
- [ ] Only return secret to webhook owner
- [ ] Consider secret rotation mechanism

### Data Validation
- [ ] Sanitize URL inputs (validate format, not content)
- [ ] Validate events against whitelist
- [ ] Prevent SQL injection (Sequelize parameterized queries)

### Audit Logging
- [ ] Log webhook creation with userId
- [ ] Log webhook updates with changes
- [ ] Log webhook deletion
- [ ] Store in separate audit log table (optional)

---

## Phase 8: Documentation ✓

### API Documentation
- [ ] Update Swagger/OpenAPI docs with real database behavior
- [ ] Document response formats
- [ ] Document error codes
- [ ] Document pagination parameters

### Developer Documentation
- [ ] Document database schema
- [ ] Document model relationships
- [ ] Document migration procedures
- [ ] Document testing procedures

### Troubleshooting Guide
- [ ] Document common errors and solutions
- [ ] Document database connection issues
- [ ] Document foreign key constraint errors
- [ ] Document performance troubleshooting

---

## Phase 9: Deployment ✓

### Pre-Deployment
- [ ] Run full test suite
- [ ] Run database migrations on test environment
- [ ] Verify all tests pass
- [ ] Code review completed

### Deployment
- [ ] Backup production database
- [ ] Deploy webhook-service with new code
- [ ] Run database migrations on production
- [ ] Verify health checks pass
- [ ] Monitor logs for errors

### Post-Deployment
- [ ] Verify webhook creation works in production
- [ ] Verify webhook listing works
- [ ] Verify webhook deletion cascades properly
- [ ] Check database size and performance
- [ ] Monitor error rates

---

## Phase 10: Migration (If Needed)

### From Mock Storage to Database
- [ ] Dump existing mock webhooks (if any)
- [ ] Create migration script
- [ ] Preserve webhook IDs if needed (use UUID)
- [ ] Test migration in dev environment
- [ ] Run migration in staging
- [ ] Run migration in production with backup

---

## Database Schema Verification

Run these queries to verify schema is correct:

```sql
-- Check WebhookEndpoint table
\d "WebhookEndpoints"

-- Should have columns:
-- - id (uuid, primary key)
-- - url (character varying)
-- - secret (text)
-- - subscribedEvents (ARRAY)
-- - isEnabled (boolean)
-- - UserId (uuid, foreign key)
-- - createdAt (timestamp)
-- - updatedAt (timestamp)

-- Check WebhookLog table
\d "WebhookLogs"

-- Should have columns:
-- - id (uuid, primary key)
-- - eventId (character varying)
-- - statusCode (integer)
-- - requestPayload (jsonb)
-- - responseBody (text)
-- - deliveryStatus (enum: SUCCESS, FAILED, PENDING)
-- - WebhookEndpointId (uuid, foreign key)
-- - createdAt (timestamp)
-- - updatedAt (timestamp)

-- Check foreign keys
SELECT constraint_name, table_name, column_name, foreign_table_name
FROM information_schema.key_column_usage
WHERE table_name IN ('WebhookEndpoints', 'WebhookLogs');
```

---

## Rollback Plan

If issues occur in production:

### Option 1: Database Rollback
```bash
# Stop webhook-service
docker stop webhook-service

# Restore database backup
pg_restore -d quicknotify /backup/quicknotify.sql

# Restart with previous code version
git checkout <previous-version>
docker start webhook-service
```

### Option 2: Graceful Degradation
- Keep mock storage as fallback
- Log database errors
- Fall back to mock if DB unavailable
- Alert operations team

### Option 3: Feature Flag
- Add feature flag for database usage
- Can disable without redeploying
- Gradual rollout with monitoring

---

## Success Criteria

✓ All tests passing (unit and integration)
✓ Webhook creation/read/update/delete works via API
✓ Delivery logs stored correctly
✓ Statistics calculated accurately
✓ No SQL errors in logs
✓ Performance acceptable (response time < 200ms)
✓ No data loss during migration
✓ Security review passed

---

## Quick Reference

### Common Commands

```bash
# Start webhook-service with new code
cd webhook-service
npm start

# Run tests
npm test

# Run specific test file
npm test -- webhookController.test.js

# Check database connection
npm run db:check

# View database schema
npm run db:schema

# Create new migration
npm run db:migrate:create -- --name add_webhook_table

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed
```

### Useful SQL Queries

```sql
-- View all webhooks for a user
SELECT * FROM "WebhookEndpoints" WHERE "UserId" = 'user-uuid';

-- View delivery logs for a webhook
SELECT * FROM "WebhookLogs" 
WHERE "WebhookEndpointId" = 'webhook-uuid'
ORDER BY "createdAt" DESC;

-- Get webhook statistics
SELECT 
  "deliveryStatus",
  COUNT(*) as count
FROM "WebhookLogs"
WHERE "WebhookEndpointId" = 'webhook-uuid'
GROUP BY "deliveryStatus";

-- Find orphaned logs (if cascade didn't work)
SELECT l.* FROM "WebhookLogs" l
LEFT JOIN "WebhookEndpoints" w ON l."WebhookEndpointId" = w.id
WHERE w.id IS NULL;
```

---

## Support & Issues

If you encounter issues:

1. Check database connection: `echo $DATABASE_URL`
2. Verify models are correctly imported
3. Check database has correct schema
4. Review webhook-service logs: `docker logs webhook-service`
5. Run tests with debug: `npm test -- --verbose`
6. Query database directly to verify data

---

This checklist ensures a smooth transition from mock storage to production database persistence.
