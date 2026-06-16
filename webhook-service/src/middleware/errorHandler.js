const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', err);
  
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

module.exports = errorHandler;