// src/index.ts
// Corrected import paths for @googlemaps/google-maps-services-js
import { Client, PlaceInputType, PlaceDetailsResponseData } from "@googlemaps/google-maps-services-js";

interface BusinessDetails {
    name: string;
    address: string;
    phone?: string;
    website?: string;
    openingHours?: string[];
    rating?: number;
    reviewCount?: number;
    googleMapsUrl?: string;
    placeId?: string;
    latitude?: number; // Added latitude for better type definition
    longitude?: number; // Added longitude for better type definition
    [key: string]: any; // Allows for additional dynamic properties
}

/**
 * Récupère les détails d'une entreprise via l'API Google Places.
 * @param businessName Le nom de l'entreprise.
 * @param address L'adresse de l'entreprise.
 * @param postalCode Le code postal de l'entreprise.
 * @param apiKey Votre clé API Google Places.
 * @returns Un objet contenant les détails de l'entreprise ou null si non trouvée/erreur.
 */
export async function getBusinessDetailsFromPlaces( // Export the function
    businessName: string,
    address: string,
    postalCode: string,
    apiKey: string
): Promise<BusinessDetails | null> {
    const query = `${businessName}, ${address}, ${postalCode}`;
    const client = new Client({});

    try {
        console.log(`Recherche du lieu pour: "${query}"`);
        const findPlaceResponse = await client.findPlaceFromText({
            params: {
                input: query,
                // Fixed: Use the enum member for inputtype
                inputtype: PlaceInputType.textQuery, // Corrected casing
                fields: ["place_id", "name", "formatted_address"],
                key: apiKey,
            },
            timeout: 10000,
        });

        const candidates = findPlaceResponse.data.candidates;

        if (!candidates || candidates.length === 0) {
            console.log(`Aucun lieu trouvé pour la requête: "${query}"`);
            return null;
        }

        const placeId = candidates[0].place_id;
        if (!placeId) {
            console.log(`Place ID non trouvé pour le premier candidat de: "${query}"`);
            return null;
        }
        console.log(`Place ID trouvé: ${placeId}`);

        // --- Étape 2: Utiliser le Place ID pour obtenir les détails complets du lieu ---
        console.log(`Récupération des détails pour le Place ID: ${placeId}`);
        const placeDetailsResponse = await client.placeDetails({
            params: {
                place_id: placeId,
                fields: [
                    "name",
                    "formatted_address",
                    "international_phone_number",
                    "website",
                    "opening_hours",
                    "rating",
                    "user_ratings_total",
                    "url",
                    "geometry", // Includes location (lat/lng)
                ],
                key: apiKey,
            },
            timeout: 10000,
        });

        const result: PlaceDetailsResponseData["result"] = placeDetailsResponse.data.result;

        if (result) {
            const businessDetails: BusinessDetails = {
                name: result.name || businessName,
                address: result.formatted_address || address,
                phone: result.international_phone_number,
                website: result.website,
                openingHours: result.opening_hours?.weekday_text,
                rating: result.rating,
                reviewCount: result.user_ratings_total,
                googleMapsUrl: result.url,
                placeId: placeId,
                latitude: result.geometry?.location.lat,
                longitude: result.geometry?.location.lng,
            };
            // Remove console.log if this function is meant to return data to an API handler
            // console.log("Détails de l'entreprise récupérés avec succès:");
            // console.log(JSON.stringify(businessDetails, null, 2));
            return businessDetails;
        } else {
            console.log(`Aucun détail trouvé pour le Place ID: ${placeId}`);
            return null;
        }

    } catch (error: any) {
        console.error("Erreur lors de la récupération des détails de l'entreprise:", error.response?.data || error.message);
        return null;
    }
}

// --- IMPORTANT: This part is for standalone testing or example. ---
// In a real server setup, you'd typically remove this block
// and use the `export` keyword on `getBusinessDetailsFromPlaces`
// to import it into your server file (e.g., `server.ts`).

const MY_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "AIzaSyC28N7_Pu362xZPH6vEYmJru8QzXMokxSw"; // Replace this placeholder!

if (MY_API_KEY === "VOTRE_CLE_API_GOOGLE_PLACES") {
    console.warn("ATTENTION: Votre clé API Google Places est un placeholder. Veuillez la remplacer par votre vraie clé API ou la définir via une variable d'environnement 'GOOGLE_PLACES_API_KEY'.");
}

// Example of a function that simulates receiving an API request.
// In a real server (Express.js, NestJS, etc.), this would be an HTTP endpoint.
async function simulateApiRequest(data: { name: string; address: string; postalCode: string }): Promise<BusinessDetails | { error: string }> {
    if (!MY_API_KEY || MY_API_KEY === "VOTRE_CLE_API_GOOGLE_PLACES") {
        return { error: "Clé API Google Places manquante ou non valide." };
    }

    try {
        const details = await getBusinessDetailsFromPlaces(
            data.name,
            data.address,
            data.postalCode,
            MY_API_KEY
        );

        if (details) {
            return details;
        } else {
            return { error: "Impossible de trouver les détails pour l'entreprise spécifiée." };
        }
    } catch (error) {
        console.error("Erreur dans la simulation de requête API:", error);
        return { error: "Une erreur interne est survenue lors du traitement de la requête." };
    }
}

// --- Example of using the simulation ---
const requestPayload = {
    name: "Musée du Louvre",
    address: "Rue de Rivoli",
    postalCode: "75001"
};

// Only run the simulation if index.ts is executed directly (not imported as a module)
if (require.main === module) {
    console.log(`\nSimulating API request for: ${requestPayload.name}, ${requestPayload.address}, ${requestPayload.postalCode}`);
    simulateApiRequest(requestPayload)
        .then(response => {
            console.log("\n--- Réponse Simulant l'API ---");
            console.log(JSON.stringify(response, null, 2));
        })
        .catch(err => {
            console.error("Erreur lors de la simulation de la requête:", err);
        });
}