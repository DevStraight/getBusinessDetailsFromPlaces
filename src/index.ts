// src/index.ts
import { Client, PlaceInputType } from "@googlemaps/google-maps-services-js";

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
}

// Enhanced validation functions
function validateName(inputName: string, apiName: string): boolean {
    const normalize = (str: string) => {
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9 ]/g, '')
            .replace(/\b(le|la|les|un|une|des|du|de|l'|the|a|an)\b/g, '')
            .trim();
    };

    const normalizedInput = normalize(inputName);
    const normalizedApi = normalize(apiName);
    
    // Check for significant word matches
    const inputWords = normalizedInput.split(' ').filter(w => w.length > 2);
    const apiWords = normalizedApi.split(' ').filter(w => w.length > 2);
    
    const matchingWords = inputWords.filter(word => 
        apiWords.includes(word)
    ).length;

    return matchingWords >= Math.min(2, Math.max(inputWords.length, apiWords.length) * 0.5);
}

function validateAddress(inputAddress: string, apiAddress: string, postalCode: string): boolean {
    const normalize = (str: string) => {
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9, ]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const normalizedInput = normalize(inputAddress);
    const normalizedApi = normalize(apiAddress);
    
    // Validate postal code presence
    const postalCodePattern = new RegExp(`\\b${postalCode}\\b`);
    if (!postalCodePattern.test(normalizedInput) && !postalCodePattern.test(normalizedApi)) {
        return false;
    }

    // Check for street number match
    const inputNumberMatch = normalizedInput.match(/\d+/);
    const apiNumberMatch = normalizedApi.match(/\d+/);
    if (inputNumberMatch && apiNumberMatch && inputNumberMatch[0] !== apiNumberMatch[0]) {
        return false;
    }

    // Check for significant address components
    const inputComponents = normalizedInput.split(/[, ]+/).filter(c => c.length > 3);
    const apiComponents = normalizedApi.split(/[, ]+/).filter(c => c.length > 3);
    
    const matchingComponents = inputComponents.filter(comp => 
        apiComponents.includes(comp)
    ).length;

    return matchingComponents >= Math.min(2, Math.max(inputComponents.length, apiComponents.length) * 0.5);
}

export async function getBusinessDetailsFromPlaces(
    businessName: string,
    address: string,
    postalCode: string,
    apiKey: string
): Promise<BusinessDetails | null> {
    const client = new Client({});

    try {
        // First try with full query
        const query = `${businessName}, ${address}, ${postalCode}`;
        const findPlaceResponse = await client.findPlaceFromText({
            params: {
                input: query,
                inputtype: PlaceInputType.textQuery,
                fields: ["place_id", "name", "formatted_address"],
                key: apiKey,
            },
            timeout: 10000,
        });

        if (!findPlaceResponse.data.candidates?.length) {
            return null;
        }

        const candidate = findPlaceResponse.data.candidates[0];
        const placeId = candidate.place_id;
        if (!placeId) return null;

        // Get full details
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
        if (!result) return null;

        // Validate either name OR address matches
        const isNameValid = validateName(businessName, result.name || '');
        const isAddressValid = validateAddress(address, result.formatted_address || '', postalCode);

        if (!isNameValid && !isAddressValid) {
            console.log(`Validation failed for ${businessName} - Name/address mismatch`);
            return null;
        }

        return {
            nom: result.name || businessName,
            adresse: result.formatted_address || address,
            phone: result.international_phone_number,
            website: result.website,
            openingHours: result.opening_hours?.weekday_text,
            rating: result.rating,
            reviewCount: result.user_ratings_total,
            googleMapsUrl: result.url,
            placeId: placeId,
            geolocalisation: result.geometry?.location ? {
                lat: result.geometry.location.lat,
                lon: result.geometry.location.lng
            } : undefined
        };

    } catch (error: any) {
        console.error("API Error:", error.response?.data || error.message);
        return null;
    }
}