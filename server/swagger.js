const swaggerJSDoc = require('swagger-jsdoc');

const host = process.env.SWAGGER_HOST || `http://localhost:${process.env.PORT || 5000}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Magazyn App API',
      version: '1.0.0',
      description: 'Minimal OpenAPI spec for magazyn_app. Add more endpoints via JSDoc or extend this spec.'
    },
    servers: [
      { url: host }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // Paths to files containing OpenAPI definitions in JSDoc format.
  apis: ['./routes/*.js', './routes/**/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
