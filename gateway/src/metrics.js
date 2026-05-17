const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register],
});

const httpRequestTotal = new client.Counter({
    name: 'http_request_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

const metricsMiddleware = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        const route = req.route ? req.route.path : req.route; // Handle cases where route is undefined

        // Update metrics with labels for method, route, and status code
        httpRequestDuration.observe({
            method: req.method,
            route: route,
            status_code: res.statusCode,
        }, duration);

        // Increment the total request counter
        httpRequestTotal.inc({
            method: req.method,
            route: route,
            status_code: res.statusCode,
        });
    });

    next();
};

module.exports = {
    register,
    metricsMiddleware,
};
