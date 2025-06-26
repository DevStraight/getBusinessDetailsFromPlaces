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
        // Ensure the model is loaded only once
        llmMatcher = await pipeline('text-classification', 'Xenova/distilbert-base-uncased');
    }
    return llmMatcher;
}

/**
 * Enhanced hybrid matching with LLM fallback and stricter basic checks.
 */
async function isValidMatch(
    searchName: string,
    searchAddress: string,
    searchPostalCode: string,
    foundName: string,
    foundAddress: string
): Promise<boolean> {
    // Basic checks first: Postal code must match
    if (!foundAddress.includes(searchPostalCode)) {
        console.log(`Mismatch: Postal code ${searchPostalCode} not found in ${foundAddress}`);
        return false;
    }

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

    // Split into words, filtering out short common words that often lead to false positives
    const searchNameWords = normSearchName.split(/\s+/).filter(w => w.length > 2 && !['du', 'de', 'la', 'le', 'des', 'et', 'a'].includes(w));
    const foundNameWords = normFoundName.split(/\s+/).filter(w => w.length > 2 && !['du', 'de', 'la', 'le', 'des', 'et', 'a'].includes(w));
    
    // For address, prioritize unique parts of the address, exclude generic street types
    const searchAddrWords = normSearchAddr.split(/\s+/).filter(w => w.length > 3 && !['route', 'rue', 'avenue', 'chemin', 'impasse', 'place'].includes(w));
    const foundAddrWords = normFoundAddr.split(/\s+/).filter(w => w.length > 3 && !['route', 'rue', 'avenue', 'chemin', 'impasse', 'place'].includes(w));

    // 1. Stricter Basic Keyword Matching (requiring more significant overlap)
    const nameWordIntersections = searchNameWords.filter(word => foundNameWords.includes(word));
    // Require at least one significant word match, and a reasonable percentage of overlap
    const basicNameMatch = nameWordIntersections.length > 0 && 
                           (nameWordIntersections.length / Math.min(searchNameWords.length || 1, foundNameWords.length || 1)) >= 0.5; // At least 50% overlap

    const addrWordIntersections = searchAddrWords.filter(word => foundAddrWords.includes(word));
    // For address, require at least one significant word match, and some percentage of overlap
    const basicAddrMatch = addrWordIntersections.length > 0 && 
                           (addrWordIntersections.length / Math.min(searchAddrWords.length || 1, foundAddrWords.length || 1)) >= 0.3; // At least 30% overlap

    console.log(`Basic Name Match (normalized: "${normSearchName}" vs "${normFoundName}"): ${basicNameMatch}`);
    console.log(`Basic Address Match (normalized: "${normSearchAddr}" vs "${normFoundAddr}"): ${basicAddrMatch}`);

    if (basicNameMatch && basicAddrMatch) {
        console.log("Basic name and address match criteria met.");
        return true;
    }

    // 2. LLM verification for ambiguous cases or when basic checks are not conclusive
    // Only proceed to LLM if basic matches are not strong enough or if there's some partial match
    if (basicNameMatch || basicAddrMatch) {
        try {
            await initializeLLM();
            const prompt = `Are these the same business? Consider name and address similarity.
Search Business: "${searchName}, ${searchAddress}, ${searchPostalCode}"
Found Business: "${foundName}, ${foundAddress}"
Answer (YES/NO):`;
            
            const llmResult = await llmMatcher(prompt);
            // The output structure for 'text-classification' might be an array of objects.
            const { label, score } = Array.isArray(llmResult) ? llmResult[0] : llmResult;
            
            console.log(`LLM match confidence: ${score} (${label})`);
            
            // Adjust the confidence threshold and label based on your LLM's output for YES/NO
            // A higher threshold ensures stricter semantic matching.
            return label.toUpperCase().includes('YES') && score > 0.85; // Increased confidence threshold
        } catch (error) {
            console.error("LLM verification failed, falling back to strict basic matching:", error);
            // If LLM fails, fall back to requiring both basic name and address match
            return basicNameMatch && basicAddrMatch; 
        }
    }

    console.log("No sufficient match found by basic checks or LLM not consulted.");
    return false; // If neither basic strong match nor LLM confirms
}

export async function getBusinessDetailsFromPlaces(
    businessName: string,
    address: string,
    postalCode: string,
    apiKey: string
): Promise<BusinessDetails | null> {
    const client = new Client({});

    try {
        console.log(`Attempting to search for: "${businessName}, ${address}, ${postalCode}"`);

        // Try multiple search variations to maximize chances with Google Places
        const queries = [
            `${businessName}, ${address}, ${postalCode}`,
            `${businessName}, ${postalCode}`,
            `${businessName}, ${address}`, // Added this variation
            businessName // Broadest query, might yield more candidates
        ];

        let candidates: any[] = [];
        for (const query of queries) {
            console.log(`Sending Google Places API findPlaceFromText query: "${query}"`);
            const response = await client.findPlaceFromText({
                params: {
                    input: query,
                    inputtype: PlaceInputType.textQuery,
                    fields: ["place_id", "name", "formatted_address"],
                    key: apiKey,
                },
                timeout: 5000, // 5 seconds timeout for this call
            });
            if (response.data.candidates?.length) {
                candidates = response.data.candidates;
                console.log(`Found ${candidates.length} candidates for query: "${query}"`);
                break; // Stop at the first query that yields candidates
            }
        }

        if (!candidates.length) {
            console.log("No candidates found by Google Places API.");
            return null;
        }

        // Evaluate candidates for the best match using isValidMatch
        for (const candidate of candidates) {
            const placeId = candidate.place_id;
            if (!placeId) {
                console.log("Candidate missing place_id, skipping.");
                continue;
            }

            console.log(`Fetching details for candidate place_id: ${placeId} (Name: "${candidate.name}", Address: "${candidate.formatted_address}")`);
            const details = await client.placeDetails({
                params: {
                    place_id: placeId,
                    fields: [
                        "name", "formatted_address", "international_phone_number",
                        "website", "opening_hours", "rating", "user_ratings_total",
                        "url", "geometry" // geometry for lat/lon
                    ],
                    key: apiKey,
                },
                timeout: 10000, // 10 seconds timeout for details call
            });

            const result = details.data.result;
            if (!result) {
                console.log(`No details found for place_id: ${placeId}, skipping.`);
                continue;
            }

            console.log(`Evaluating candidate: Found Name: "${result.name}", Found Address: "${result.formatted_address}"`);
            const isValid = await isValidMatch(
                businessName,
                address,
                postalCode,
                result.name || '',
                result.formatted_address || ''
            );

            if (isValid) {
                console.log("Valid match found!");
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
            } else {
                console.log("Candidate did not pass isValidMatch criteria.");
            }
        }

        console.log("No valid business details found after evaluating all candidates.");
        return null;

    } catch (error: any) {
        console.error("Error in getBusinessDetailsFromPlaces:", error.response?.data?.error_message || error.message);
        // Log the full error response data if available for debugging
        if (error.response?.data) {
            console.error("Google Maps API error details:", error.response.data);
        }
        return null;
    }
}