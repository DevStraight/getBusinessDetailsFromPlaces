// src/index.ts
import { Client, PlaceInputType } from "@googlemaps/google-maps-services-js";
import { pipeline } from '@xenova/transformers';

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

// Initialize LLM matcher (runs locally)
let llmMatcher: any;
async function initializeLLM() {
    if (!llmMatcher) {
        llmMatcher = await pipeline('text-classification', 'Xenova/distilbert-base-uncased');
    }
    return llmMatcher;
}

/**
 * Enhanced hybrid matching with LLM fallback
 */
async function isValidMatch(
    searchName: string,
    searchAddress: string,
    searchPostalCode: string,
    foundName: string,
    foundAddress: string
): Promise<boolean> {
    // Basic checks first
    if (!foundAddress.includes(searchPostalCode)) return false;

    // Normalize strings
    const normalize = (str: string) => 
        str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
           .replace(/[^a-zA-Z0-9\s]/g, '')
           .toLowerCase()
           .trim() || '';

    const normSearchName = normalize(searchName);
    const normFoundName = normalize(foundName);
    const normSearchAddr = normalize(searchAddress);
    const normFoundAddr = normalize(foundAddress);

    // 1. Basic keyword matching
    const basicNameMatch = normSearchName.split(/\s+/).some(kw => 
        kw.length > 2 && normFoundName.includes(kw));
    const basicAddrMatch = normSearchAddr.split(/\s+/).some(kw => 
        kw.length > 3 && normFoundAddr.includes(kw));

    if (basicNameMatch && basicAddrMatch) return true;

    // 2. LLM verification for ambiguous cases
    try {
        await initializeLLM();
        const prompt = `Are these the same business?\nSearch: "${searchName} at ${searchAddress}"\nFound: "${foundName} at ${foundAddress}"\nAnswer:`;
        
        const { label, score } = await llmMatcher(prompt);
        console.log(`LLM match confidence: ${score} (${label})`);
        
        return label === 'YES' && score > 0.7;
    } catch (error) {
        console.error("LLM verification failed, falling back to basic matching");
        return basicNameMatch || basicAddrMatch;
    }
}

export async function getBusinessDetailsFromPlaces(
    businessName: string,
    address: string,
    postalCode: string,
    apiKey: string
): Promise<BusinessDetails | null> {
    const client = new Client({});

    try {
        console.log(`Searching: "${businessName}, ${address}, ${postalCode}"`);

        // Try multiple search variations
        const queries = [
            `${businessName}, ${address}, ${postalCode}`,
            `${businessName}, ${postalCode}`,
            businessName
        ];

        let candidates: any[] = [];
        for (const query of queries) {
            const response = await client.findPlaceFromText({
                params: {
                    input: query,
                    inputtype: PlaceInputType.textQuery,
                    fields: ["place_id", "name", "formatted_address"],
                    key: apiKey,
                },
                timeout: 5000,
            });
            if (response.data.candidates?.length) {
                candidates = response.data.candidates;
                break;
            }
        }

        if (!candidates.length) return null;

        // Evaluate candidates
        for (const candidate of candidates) {
            const placeId = candidate.place_id;
            if (!placeId) continue;

            const details = await client.placeDetails({
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

            const result = details.data.result;
            if (!result) continue;

            const isValid = await isValidMatch(
                businessName,
                address,
                postalCode,
                result.name || '',
                result.formatted_address || ''
            );

            if (isValid) {
                return {
                    nom: result.name || businessName,
                    adresse: result.formatted_address || address,
                    phone: result.international_phone_number,
                    website: result.website,
                    openingHours: result.opening_hours?.weekday_text,
                    rating: result.rating,
                    reviewCount: result.user_ratings_total,
                    googleMapsUrl: result.url,
                    placeId,
                    geolocalisation: result.geometry?.location ? {
                        lat: result.geometry.location.lat,
                        lon: result.geometry.location.lng
                    } : undefined
                };
            }
        }

        return null;

    } catch (error: any) {
        console.error("Error:", error.response?.data || error.message);
        return null;
    }
}