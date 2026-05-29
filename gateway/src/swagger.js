const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'QuickNotify API',
            version: '1.0.0',
            description: 'API documentation for QuickNotify',
        },
        servers: [
            {
                url: 'https://tender-youthfulness-production-6712.up.railway.app',
                description: 'Production server',
            },
            {
                url: 'http://localhost:3000',
                description: 'Local development',
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
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: 'API key authentication using x-api-key header',
                },
            },
        },
    },
        apis: ['./src/index.js'],
    };

    module.exports = swaggerJsdoc(options);