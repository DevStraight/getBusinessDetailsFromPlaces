// src/index.ts
import { Client, PlaceInputType, PlaceDetailsResponseData } from "@googlemaps/google-maps-services-js";

interface BusinessDetails {
    nom: string;                
    adresse: string;          
    phone?: string;
    website?: string;
    openingHours?: string[];
    rating?: number;
    reviewCount?: number;
    googleMapsUrl?: string;
    placeId?: string;
    geolocalisation?: {    
        lat: number;
        lon: number;
    };
    [key: string]: any;
}

/**
 * Retrieves business details from Google Places API.
 * @param businessName The name of the business (required)
 * @param address The address of the business (required)
 * @param postalCode The postal code (required)
 * @param apiKey Google Places API key
 */
export async function getBusinessDetailsFromPlaces(
    businessName: string,
    address: string,
    postalCode: string,
    apiKey: string
): Promise<BusinessDetails | null> {
    const query = `${businessName}, ${address}, ${postalCode}`;
    const client = new Client({});

    try {
        console.log(`Searching for place: "${query}"`);

        const findPlaceResponse = await client.findPlaceFromText({
            params: {
                input: query,
                inputtype: PlaceInputType.textQuery,
                fields: ["place_id", "name", "formatted_address"],
                key: apiKey,
            },
            timeout: 10000,
        });

        const candidates = findPlaceResponse.data.candidates;
        if (!candidates || candidates.length === 0) {
            console.log(`No place found for query: "${query}"`);
            return null;
        }

        const placeId = candidates[0].place_id;
        if (!placeId) {
            console.log(`No place ID found for the first candidate of: "${query}"`);
            return null;
        }

        console.log(`Found place ID: ${placeId}`);
        const placeDetailsResponse = await client.placeDetails({
            params: {
                place_id: placeId,
                fields: [
                    "name", "formatted_address", "international_phone_number",
                    "website", "opening_hours", "rating", "user_ratings_total",
                    "url", "geometry"
                ],
                key: apiKey,
            },
            timeout: 10000,
        });

        const result = placeDetailsResponse.data.result;
        if (!result) {
            console.log(`No details found for place ID: ${placeId}`);
            return null;
        }

        return {
            nom: result.name || businessName,  // Changed to 'nom'
            adresse: result.formatted_address || address,  // Changed to 'adresse'
            phone: result.international_phone_number,
            website: result.website,
            openingHours: result.opening_hours?.weekday_text,
            rating: result.rating,
            reviewCount: result.user_ratings_total,
            googleMapsUrl: result.url,
            placeId: placeId,
            geolocalisation: result.geometry?.location ? {  // Changed to grouped geolocalisation
                lat: result.geometry.location.lat,
                lon: result.geometry.location.lng
            } : undefined
        };

    } catch (error: any) {
        console.error("Error fetching business details:", error.response?.data || error.message);
        return null;
    }
}