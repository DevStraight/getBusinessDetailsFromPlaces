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
    [key: string]: any;
}

/**
 * Normalizes text for comparison (removes accents, punctuation, and converts to lowercase)
 */
function normalizeText(text: string): string {
    return text
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove punctuation
        .toLowerCase()
        .trim();
}

/**
 * Checks if the found name matches the search name (flexible matching)
 */
function isNameMatch(searchName: string, foundName: string): boolean {
    const normalizedSearch = normalizeText(searchName);
    const normalizedFound = normalizeText(foundName);
    
    // Split into keywords
    const searchKeywords = normalizedSearch.split(/\s+/);
    const foundKeywords = normalizedFound.split(/\s+/);
    
    // Count matching keywords (at least half must match)
    const matchingKeywords = searchKeywords.filter(searchKeyword => 
        foundKeywords.some(foundKeyword => 
            foundKeyword.includes(searchKeyword) || searchKeyword.includes(foundKeyword)
        )
    ).length;
    
    return matchingKeywords >= Math.max(1, searchKeywords.length / 2);
}

/**
 * Checks if the found address matches the search address and postal code
 */
function isAddressMatch(searchAddress: string, searchPostalCode: string, foundAddress: string): boolean {
    const normalizedSearchAddr = normalizeText(searchAddress);
    const normalizedFoundAddr = normalizeText(foundAddress);
    
    // Extract postal code from found address
    const postalCodeRegex = /(\b\d{5}\b)/; // Match 5-digit postal code
    const foundPostalCodeMatch = foundAddress.match(postalCodeRegex);
    const foundPostalCode = foundPostalCodeMatch ? foundPostalCodeMatch[0] : '';
    
    // Check if address contains search terms or vice versa
    const addressContainsSearch = normalizedFoundAddr.includes(normalizedSearchAddr) || 
                                normalizedSearchAddr.includes(normalizedFoundAddr);
    
    // Check if postal code matches (if we have one in the search)
    const postalCodesMatch = !searchPostalCode || foundPostalCode === searchPostalCode;
    
    return addressContainsSearch && postalCodesMatch;
}

/**
 * Retrieves business details from Google Places API with flexible matching
 */
export async function getBusinessDetailsFromPlaces(
    businessName: string,
    address: string,
    postalCode: string,
    apiKey: string
): Promise<BusinessDetails | null> {
    const client = new Client({});

    try {
        // First try: Search with all details
        let query = `${businessName}, ${address}, ${postalCode}`;
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

        // If no results, try with just name and postal code
        let candidates = findPlaceResponse.data.candidates;
        if (!candidates || candidates.length === 0) {
            query = `${businessName}, ${postalCode}`;
            console.log(`Trying alternative search: "${query}"`);
            
            const altResponse = await client.findPlaceFromText({
                params: {
                    input: query,
                    inputtype: PlaceInputType.textQuery,
                    fields: ["place_id", "name", "formatted_address"],
                    key: apiKey,
                },
                timeout: 10000,
            });
            candidates = altResponse.data.candidates;
        }

        if (!candidates || candidates.length === 0) {
            console.log(`No place found for query: "${query}"`);
            return null;
        }

        // Check candidates for matches
        for (const candidate of candidates) {
            const placeId = candidate.place_id;
            if (!placeId) continue;

            const candidateName = candidate.name || '';
            const candidateAddress = candidate.formatted_address || '';
            
            // Check matches with flexible criteria
            const nameMatches = isNameMatch(businessName, candidateName);
            const addressMatches = isAddressMatch(address, postalCode, candidateAddress);
            
            if (!nameMatches && !addressMatches) {
                console.log(`Skipping candidate - no match:`);
                console.log(`  Search: "${businessName}" vs Found: "${candidateName}"`);
                console.log(`  Search: "${address}, ${postalCode}" vs Found: "${candidateAddress}"`);
                continue;
            }

            console.log(`Found potential match, getting details for place ID: ${placeId}`);
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
            if (!result) continue;

            // Final verification with detailed info
            const finalName = result.name || '';
            const finalAddress = result.formatted_address || '';
            
            const finalNameMatch = isNameMatch(businessName, finalName);
            const finalAddressMatch = isAddressMatch(address, postalCode, finalAddress);
            
            if (finalNameMatch || finalAddressMatch) {
                return {
                    nom: finalName,
                    adresse: finalAddress,
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
            }
        }

        console.log(`No valid matches found after checking all candidates`);
        return null;

    } catch (error: any) {
        console.error("Error fetching business details:", error.response?.data || error.message);
        return null;
    }
}