// src/index.ts
import { Client } from "@googlemaps/google-maps-services-js";
import { PlaceDetailsResponseData } from "@googlemaps/google-maps-services-js/dist/places";

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
    [key: string]: any;
}

async function getBusinessDetailsFromPlaces(
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
                inputtype: "textquery",
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
            };
            console.log("Détails de l'entreprise récupérés avec succès:");
            console.log(JSON.stringify(businessDetails, null, 2));
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

const MY_API_KEY = ""; 

async function runExample() {
    const businessName = "Maison de la Radio";
    const businessAddress = "Avenue du Président Kennedy";
    const businessPostalCode = "75016";

    const details = await getBusinessDetailsFromPlaces(
        businessName,
        businessAddress,
        businessPostalCode,
        MY_API_KEY
    );

    if (details) {
        console.log("\n--- Résultat Final ---");
        console.log(JSON.stringify(details, null, 2));
    } else {
        console.log("\n--- Impossible de récupérer les détails pour l'entreprise spécifiée. ---");
    }
}

runExample();