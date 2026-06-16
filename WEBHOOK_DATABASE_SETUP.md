# Setting Up Database Connection in Webhook Service

## Option 1: Shared Database Configuration (Recommended)

### Setup Approach
Both auth-service and webhook-service connect to the same PostgreSQL database and share the same Sequelize models.

### Step 1: Create Shared Models Module

Create a new package or directory structure:

```
shared/
├── models/
│   ├── index.js          (exports all models)
│   ├── User.js
│   ├── WebhookEndpoint.js
│   └── WebhookLog.js
├── config/
│   └── db.js             (Sequelize connection)
└── package.json
```

### Step 2: Create Shared Database Config

**shared/config/db.js:**
```javascript
const { Sequelize } = require('sequelize');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || 
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const sequelize = new Sequelize(dbUrl, {
  logging: process.env.SQL_DEBUG === 'true' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialect: 'postgres',
  // SSL for production
  ...(process.env.NODE_ENV === 'production' && {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }),
});

module.exports = sequelize;
```

### Step 3: Export Shared Models

**shared/models/index.js:**
```javascript
const sequelize = require('../config/db');
const User = require('./User');
const WebhookEndpoint = require('./WebhookEndpoint');
const WebhookLog = require('./WebhookLog');

// Define associations
User.hasMany(WebhookEndpoint, { foreignKey: 'UserId', onDelete: 'CASCADE' });
WebhookEndpoint.belongsTo(User, { foreignKey: 'UserId' });

WebhookEndpoint.hasMany(WebhookLog, { foreignKey: 'WebhookEndpointId', onDelete: 'CASCADE' });
WebhookLog.belongsTo(WebhookEndpoint, { foreignKey: 'WebhookEndpointId' });

module.exports = {
  sequelize,
  User,
  WebhookEndpoint,
  WebhookLog,
};
```

### Step 4: Update Auth Service

**auth-service/src/models/index.js:**
```javascript
const { sequelize, User, WebhookEndpoint, WebhookLog } = require('../../../shared/models');

module.exports = {
  sequelize,
  User,
  WebhookEndpoint,
  WebhookLog,
};
```

### Step 5: Update Webhook Service

**webhook-service/src/config/db.js:**
```javascript
const { sequelize, User, WebhookEndpoint, WebhookLog } = require('../../../shared/models');

module.exports = {
  sequelize,
  User,
  WebhookEndpoint,
  WebhookLog,
};
```

**webhook-service/src/controllers/webhookController.js:**
```javascript
const { WebhookEndpoint, WebhookLog } = require('../config/db');

// Now use locally instead of relative require
```

### Step 6: Initialize Database in Webhook Service

**webhook-service/src/index.js:**
```javascript
const express = require('express');
require('dotenv').config();
const logger = require('./config/logger');
const { sequelize, WebhookEndpoint, WebhookLog } = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { connectRedis } = require('./config/redis');
const { startEventConsumer } = require('./services/eventConsumer');
const { startJobWorker } = require('./services/jobWorker');
const errorHandler = require('./middleware/errorHandler');
const webhookRoutes = require('./routes/webhooks');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Webhook service is running',
    database: sequelize.authenticate() ? 'connected' : 'disconnected'
  });
});

// Webhook management routes
app.use('/api/webhooks', webhookRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3004;

async function start() {
  try {
    logger.info('Starting webhook-service...');
    
    // Connect to database
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    
    // Sync models (optional for development)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }
    
    // Connect to RabbitMQ
    await connectRabbitMQ();
    
    // Connect to Redis
    await connectRedis();
    
    // Start consuming events
    await startEventConsumer();
    
    // Start the job worker
    startJobWorker();
    
    app.listen(PORT, () => {
      logger.info(`Webhook Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start webhook-service:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
```

---

## Option 2: Separate Database Connection (Alternative)

### Setup Approach
Each service has its own Sequelize instance connecting to the same database.

### Implementation

**webhook-service/src/config/db.js:**
```javascript
const { Sequelize, DataTypes } = require('sequelize');
const logger = require('./logger');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'quicknotify',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.SQL_DEBUG === 'true' ? logger.debug : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    ...(process.env.NODE_ENV === 'production' && {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }),
  }
);

// Define models locally
const WebhookEndpoint = sequelize.define('WebhookEndpoint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isURL: true,
    },
  },
  secret: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  subscribedEvents: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

const WebhookLog = sequelize.define('WebhookLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  eventId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  requestPayload: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  responseBody: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deliveryStatus: {
    type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
}, {
  timestamps: true,
});

// Define associations
WebhookEndpoint.hasMany(WebhookLog, { 
  foreignKey: 'WebhookEndpointId', 
  onDelete: 'CASCADE' 
});
WebhookLog.belongsTo(WebhookEndpoint, { 
  foreignKey: 'WebhookEndpointId' 
});

module.exports = {
  sequelize,
  WebhookEndpoint,
  WebhookLog,
};
```

---

## Environment Configuration

### Development (.env)

**webhook-service/.env:**
```env
# Server
PORT=3004
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quicknotify
DB_USER=postgres
DB_PASSWORD=postgres
# OR use single URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/quicknotify

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
SQL_DEBUG=false
```

### Production (.env)

**webhook-service/.env.production:**
```env
# Server
PORT=3004
NODE_ENV=production

# Database (Cloud DB)
DATABASE_URL=postgresql://user:pass@db.example.com:5432/quicknotify

# RabbitMQ (Cloud)
RABBITMQ_URL=amqps://user:pass@rabbitmq.example.com:5672

# Redis (Cloud)
REDIS_URL=rediss://user:pass@redis.example.com:6379

# Logging
LOG_LEVEL=warn
SQL_DEBUG=false
```

### Docker Compose

**docker-compose.yml:**
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: quicknotify
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  webhook-service:
    build: ./webhook-service
    environment:
      NODE_ENV: development
      PORT: 3004
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/quicknotify
      RABBITMQ_URL: amqp://rabbitmq:5672
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - rabbitmq
      - redis
    ports:
      - "3004:3004"

volumes:
  postgres_data:
```

---

## Testing Database Setup

### Unit Tests with Mock Database

**webhook-service/__tests__/unit/webhookController.test.js:**
```javascript
jest.mock('../../src/config/db', () => ({
  WebhookEndpoint: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  WebhookLog: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
  },
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
  },
}));
```

### Integration Tests with Test Database

**webhook-service/__tests__/integration/webhookDatabase.integration.test.js:**
```javascript
const { sequelize, WebhookEndpoint, WebhookLog } = require('../../src/config/db');

describe('Webhook Database Integration', () => {
  beforeAll(async () => {
    // Use test database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clear tables after each test
    await WebhookLog.destroy({ where: {} });
    await WebhookEndpoint.destroy({ where: {} });
  });

  it('should create webhook endpoint', async () => {
    const webhook = await WebhookEndpoint.create({
      UserId: 'user-123',
      url: 'https://example.com/webhook',
      secret: 'secret-key',
      subscribedEvents: ['delivery.completed'],
      isEnabled: true,
    });

    expect(webhook.id).toBeDefined();
    expect(webhook.url).toBe('https://example.com/webhook');
  });
});
```

---

## Database Connection Verification

### Check Connection

```bash
# From webhook-service directory
npm test -- --testNamePattern="database connection"
```

### Manual Verification

```javascript
// webhook-service/src/test-db-connection.js
const { sequelize } = require('./config/db');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');
    process.exit(0);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
})();
```

Run with:
```bash
node src/test-db-connection.js
```

---

## Migration Strategy

### Initial Migration

```sql
-- Already exists in auth-service, but verify in webhook-service context

CREATE TABLE IF NOT EXISTS "WebhookEndpoints" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserId" UUID NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret TEXT NOT NULL,
  "subscribedEvents" VARCHAR[] DEFAULT '{}',
  "isEnabled" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("UserId") REFERENCES "Users"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "WebhookLogs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "WebhookEndpointId" UUID NOT NULL,
  "eventId" VARCHAR(255) NOT NULL,
  "statusCode" INTEGER,
  "requestPayload" JSONB NOT NULL,
  "responseBody" TEXT,
  "deliveryStatus" VARCHAR(20) DEFAULT 'PENDING',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("WebhookEndpointId") REFERENCES "WebhookEndpoints"(id) ON DELETE CASCADE
);

CREATE INDEX idx_webhook_endpoint_user_id ON "WebhookEndpoints"("UserId");
CREATE INDEX idx_webhook_log_endpoint_id ON "WebhookLogs"("WebhookEndpointId");
CREATE INDEX idx_webhook_log_created_at ON "WebhookLogs"("createdAt" DESC);
```

---

## Troubleshooting

### Issue: Cannot connect to database

**Solution:**
```bash
# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check if postgres running
docker ps | grep postgres
```

### Issue: Foreign key constraint violation

**Solution:**
```javascript
// Ensure UserId exists in Users table before creating webhook
const user = await User.findByPk(userId);
if (!user) {
  throw new Error('User not found');
}
```

### Issue: Models not syncing

**Solution:**
```javascript
// In development, force sync
await sequelize.sync({ force: true, alter: true });

// In production, use migrations instead
```

### Issue: Connection pool exhausted

**Solution:**
- Increase pool size in db config
- Check for connection leaks
- Monitor active connections:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'quicknotify';
```

---

This setup ensures webhook-service has proper database connectivity for persistent storage of webhooks and delivery logs.
