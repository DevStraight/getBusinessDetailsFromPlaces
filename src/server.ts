// src/server.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
// Removed 'path' import as it's no longer needed for static files
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { getBusinessDetailsFromPlaces } from './index';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// --- Swagger/OpenAPI Setup ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Google Business Details API',
            version: '1.0.0',
            description: 'API to retrieve Google Places business details based on name, address, and postal code.',
            contact: {
                name: 'Your Name/Company',
                url: 'http://yourwebsite.com',
                email: 'contact@yourwebsite.com',
            },
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Local development server',
            },
        ],
        components: {
            schemas: {
                BusinessInput: {
                    type: 'object',
                    required: ['name', 'address', 'postalCode'],
                    properties: {
                        name: {
                            type: 'string',
                            description: 'The name of the business.',
                            example: 'Musée du Louvre',
                        },
                        address: {
                            type: 'string',
                            description: 'The street address of the business.',
                            example: 'Rue de Rivoli',
                        },
                        postalCode: {
                            type: 'string',
                            description: 'The postal code of the business.',
                            example: '75001',
                        },
                    },
                },
                BusinessDetailsResponse: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        address: { type: 'string' },
                        phone: { type: 'string' },
                        website: { type: 'string' },
                        openingHours: { type: 'array', items: { type: 'string' } },
                        rating: { type: 'number', format: 'float' },
                        reviewCount: { type: 'integer' },
                        googleMapsUrl: { type: 'string', format: 'url' },
                        placeId: { type: 'string' },
                        latitude: { type: 'number', format: 'float' },
                        longitude: { type: 'number', format: 'float' },
                    },
                    example: {
                        "name": "Musée du Louvre",
                        "address": "Rue de Rivoli, 75001 Paris, France",
                        "phone": "+33 1 40 20 53 17",
                        "website": "http://www.louvre.fr/",
                        "openingHours": [
                          "lundi: 09:00-18:00",
                          "mardi: Fermé",
                          "mercredi: 09:00-18:00",
                          "jeudi: 09:00-18:00",
                          "vendredi: 09:00-21:45",
                          "samedi: 09:00-18:00",
                          "dimanche: 09:00-18:00"
                        ],
                        "rating": 4.7,
                        "reviewCount": 268953,
                        "googleMapsUrl": "https://maps.google.com/?cid=17565349581333481267",
                        "placeId": "ChIJb1G_y31y5kcRWwD9d_Hl75s",
                        "latitude": 48.860611,
                        "longitude": 2.337644
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'A message describing the error.',
                        },
                    },
                    example: {
                        error: 'Missing required parameters: name, address, or postalCode.'
                    }
                }
            },
        },
    },
    apis: ['./src/server.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware to parse JSON body
app.use(express.json());

// --- Removed: No longer serving static files or index.html ---
// app.use(express.static(path.join(__dirname, '../public')));
// app.get('/', (req: Request, res: Response) => {
//     res.sendFile(path.join(__dirname, '../public', 'index.html'));
// });

// --- Swagger UI endpoint ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


/**
 * @swagger
 * /api/business-details:
 * post:
 * summary: Retrieve Google Places business details.
 * description: Fetches detailed information for a business from Google Places API using its name, address, and postal code.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/BusinessInput'
 * responses:
 * 200:
 * description: Successfully retrieved business details.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/BusinessDetailsResponse'
 * 400:
 * description: Bad request - Missing parameters.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 404:
 * description: Business not found for the provided information.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Internal server error or API key missing.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/business-details', async (req: Request, res: Response) => {
    const { name, address, postalCode } = req.body;

    if (!name || !address || !postalCode) {
        return res.status(400).json({ error: "Missing required parameters: name, address, or postalCode." });
    }

    if (!GOOGLE_PLACES_API_KEY) {
        console.error("GOOGLE_PLACES_API_KEY is not set. Please set it in your .env file.");
        return res.status(500).json({ error: "Server configuration error: Google API Key missing." });
    }

    try {
        const details = await getBusinessDetailsFromPlaces(name, address, postalCode, GOOGLE_PLACES_API_KEY);

        if (details) {
            res.json(details);
        } else {
            res.status(404).json({ error: "Business details not found for the provided information." });
        }
    } catch (error) {
        console.error("Error fetching business details:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log("Waiting for API requests...");
    console.log(`Open http://localhost:${port}/api-docs for API documentation (Swagger UI).`);
});