// src/server.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { getBusinessDetailsFromPlaces } from './index';

dotenv.config();

const app = express();
// Convert port to number with fallback
const port = parseInt(process.env.PORT || '3000', 10);
const HOST = '192.168.0.51'; // Your hardcoded IP

app.use(express.json());

app.post('/api/business-details', async (req: Request, res: Response) => {
    const { name, address, postalCode } = req.body;
    
    if (!name || !address || !postalCode) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
        return res.status(500).json({ error: "Server configuration error" });
    }

    try {
        const details = await getBusinessDetailsFromPlaces(
            name,
            address,
            postalCode,
            process.env.GOOGLE_PLACES_API_KEY
        );

        if (!details) {
            return res.status(404).json({ 
                error: "No valid business found or data validation failed",
                validation: {
                    name: name,
                    address: address,
                    postalCode: postalCode
                }
            });
        }

        res.json(details);
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(port, HOST, () => {
    console.log(`Server running on http://${HOST}:${port}`);
});