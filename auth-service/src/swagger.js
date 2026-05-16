const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'QuickNotify Auth API',
            version: '1.0.0',
            description: 'API documentation for QuickNotify Authentication Service',
        },
        servers: [
            {
                url: 'quicknotify-production.up.railway.app',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header using the Bearer scheme',
                },
            },
        },
    },
    apis: ['./src/index.js'],
};

module.exports = swaggerJsdoc(options);