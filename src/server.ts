// src/server.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

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
                url: `http://192.168.0.51:${port}`,
                description: 'Local development server (accessible on LAN)',
            },
        ],
    },
    apis: [path.join(__dirname, '../config/swagger.yaml')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware to parse JSON body
app.use(express.json());

// --- Swagger UI endpoint ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Your API endpoint
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

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://192.168.0.51:${port}`);
    console.log("Waiting for API requests...");
    console.log(`Open http://192.168.0.51:${port}/api-docs for API documentation (Swagger UI).`);
});