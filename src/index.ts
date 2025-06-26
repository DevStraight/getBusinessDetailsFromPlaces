import { Client, PlaceInputType } from "@googlemaps/google-maps-services-js";
import { pipeline } from '@xenova/transformers';

/**
 * Defines the structure for business details to be returned.
 */
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
    [key: string]: any; // Allows for additional properties if needed
}

// Initialize LLM matcher (runs locally)
let llmMatcher: any;
/**
 * Initializes the local LLM for text classification.
 * This function ensures the model is loaded only once.
 */
async function initializeLLM() {
    if (!llmMatcher) {
        console.log("Initializing LLM for text classification (Xenova/distilbert-base-uncased)...");
        try {
            // Ensure you have internet access for the first time it downloads the model
            llmMatcher = await pipeline('text-classification', 'Xenova/distilbert-base-uncased');
            console.log("LLM initialized successfully.");
        } catch (error) {
            console.error("CRITICAL ERROR: LLM failed to initialize. Semantic matching will be unavailable. Please check your network and Xenova setup.", error);
            console.error("Common causes: No internet access, corporate firewall, corrupted model cache, incompatible Node.js version.");
            console.error("To troubleshoot: Try deleting ~/.cache/huggingface/hub or C:\\Users\\YOUR_USERNAME\\.cache\\huggingface\\hub and retry.");
            llmMatcher = null; // Set to null to indicate failure, so it's not used.
        }
    }
    return llmMatcher;
}

// Global state for dynamic filters - now pre-populated from the provided CSV
let _commonNamesInitialized = false;
let _genericNameWords: Set<string>; // Declare it, but initialize in the function


/**
 * Initializes dynamic common name filters using the pre-provided list.
 * This function ensures the generic name words are loaded only once.
 */
async function initializeCommonNameFilters() {
    if (_commonNamesInitialized) {
        return;
    }

    console.log("Initializing common name filters from provided list...");
    // These words are directly from the user-provided 'unique_frequent_words.csv' content.
    const commonWordsList = ["03","09","1","10","100","11","12","13","15","16","18","19","2","20","3","37","4","5","6","7","8","a",
        "abbaye","abeille","abeilles","abers","acacias","agricole","air","alpines","amap","apicole","apiculteur","apiculture","ar","arc",
        "armement","artisanale","asinerie","asperges","assiette","association","atelier","ateliers","au","auberge","avenue","avicole","b",
        "baie","balade","bar","baraques","bas","basque","basse","bastide","bateau","baume","beau","bec","bel","belette","belle","bien",
        "biere","bio","bis","bisons","blanc","blanche","blanches","blancs","bleu","bleue","bleues","blé","bocage","boeuf","bois","bon",
        "bonheur","bonne","bons","borde","borie","bosc","bosquet","bouche","boucherie","boulange","boulevard","bourg","bout","boutique",
        "bouverie","brasserie","brebis","brie","brouette","brousse","brun","bruyère","bruyères","buis","buisson","bulles","buron","by",
        "cabane","cabanon","cabra","cabras","cabrettes","cabri","cabriolait","cabrioles","cabris","café","cagouille","cailles","cal",
        "camargue","camp","campagne","camping","campus","can","canard","canards","cap","caprice","caprices","carré","casse","cave","caveau",
        "caves","caviar","cellier","centre","cerfs","cest","chalets","chambres","champ","champignons","champi","champs","chant","chante",
        "chapelle","charcuterie","charme","charmes","chaudron","chaumes","chemin","chemins","chevrerie","chevres","chevriers","chez","chèvre",
        "chèvrerie","chèvres","chêne","chênes","cidre","cidrerie","cie","ciel","cinq","ciron","citron","cité","clairette","clef","clos","clède",
        "clé","cochon","cochons","cocotte","cocottes","coeur","coin","colline","collines","colombier","combe","combes","commanderie","compagnie",
        "comptoir","confitures","conserves","coopérative","coquelicots","coquillages","cote","coteaux","coudriers","cour","cours",
        "cressonnieres","creux","crinières","croix","croquez","cru","crus","cueillette","cultures","cèdres","côte","côteaux","côté","d",
        "dabeilles","dame","damour","dangélique","dans","de","deau","delices","délices","direct","distillerie","dit","dom","domaine","domaines",
        "dou","douceurs","drive","du","eaux","ecole","elevage","eleveurs","en","enclos","entre","epi","escales","escargot","escargots","espace",
        "esplanade","essarts","est","et","ets","eurl","ex","exploitation","fage","famille","farine","ferme","fermeauberge","fermes","fermette",
        "fermier","fermiers","fermière","fermières","figues","fil","fille","filles","fils","flaguerie","fleuri","fleurs","florale","foie",
        "folies","font","fontaine","fontaines","forez","forges","forêt","fourche","fourchette","fournil","frais","fraise","fraiseraie",
        "fraises","framboisier","france","fromagerie","fromages","fromagère","fruit","fruitière","fruits","fées","fêtes","gaec","garde",
        "gare","garenne","général","gîte","gîtes","haie","halle","halles","hameau","haut","haute","hautes","hauts","helix","herbe","herbes",
        "hirondelles","hop","horticole","horticulteur","horticulture","hotel","houlette","huile","huilerie","huiles","huîtres","ibis","ignames",
        "ile","impasse","j","jardin","jardins","jas","la","labbaye","labeille","laborie","lac","lacs","lagneau","laire","lairial","lait","laiterie","lambroisie",
        "lan","lande","landes","lapin","larbre","las","lassiette","latelier","lauberge","lavandes","lavandin","lavoir","lay","le","leau","lechelle",
        "lecole","leglise","lenclos","les","lescargot","lescargotière","lespérance","lessenciel","lessentiel","lherbier","lherm","lhermitage",
        "liberté","libres","lieu","lilas","lile","lill","lilot","limousin","limousine","liouner","livraison","lo","local","locavor","loges",
        "logis","loire","loiseau","lomignon","long","lor","loriot","lorme","lorrain","lorraine","lorée","loup","lours","luberon","lycée","légumes",
        "létable","m","ma","madame","magasin","mail","maine","mairie","maison","maisons","manade","manoir","mané","maraicher","maraichère","marais",
        "maraîchage","maraîcher","maraîchère","marche","marché","mare","marguerite","marronniers","mas","meinau","mer","merle","meslay","mesnil","meuhg",
        "meules","miel","miellerie","miels","mignon","mille","millet","mimosas","minervois","mirabelle","mohair","moi","mon","monde","mont","montagne",
        "montagnes","monts","motte","moulin","moulins","moun","mouton","moutons","moutte","musée","myrtille","métairie","nature","naturellement","neuf","neuve",
        "noir","noire","noisette","noix","nord","normand","normande","normandes","normandie","nos","nouvelle","o","oeufs","oies","oliveraie","oliviers","oléicole",
        "orchidées","ouest","ours","pages","paille","pain","pains","palais","panier","paniers","papilles","paradis","parc","paris","parking","parvis","pas","passion",
        "pastorale","pays","paysan","paysanne","paysannes","paysans","pe","pech","pepiniere","pepinieres","perrière","petit","petite","petites","petits","pic","pieds",
        "pigeonneaux","pigeonnier","pigeons","pin","pis","pisciculture","place","plaine","plaisance","plaisirs","plan","plantes","plassons","plateau","plein","plessis",
        "plume","plumes","point","poirier","pom","pommeraie","pommes","pommier","pont","porc","porcs","port","portail","porte","portes","possibles","potager","potagers",
        "potaverger","poulailler","poule","poules","poulet","poulettes","prade","prairie","prairies","pre","pres","presbytère","presquîle","pressoir","prieuré","prim",
        "producteur","producteurs","produits","provence","pruneau","pré","prés","ptit","ptite","ptites","ptits","puech","puy","pyrénées","pâtes","pédagogique","pépinières",
        "périgord","pêche","pêcheurs","quatre","querelle","qui","racines","ranch","reines","relais","renard","restaurant","retrait","rhuys","rive","rivière","rivières","roc",
        "roche","rocher","roches","roi","rose","roses","rosier","rossignol","rouge","rouges","route","ruche","rucher","ruchers","rue","république","sa","sables","sablons",
        "sabots","safran","saison","saisons","salers","salle","salles","sauvage","sauvages","sauveur","saveur","saveurs","savoie","savonnerie","scea","scev","sel","selle",
        "semporte","sens","serre","serres","si","simples","snc","sncf","social","soldanelles","soleil","sologne","sonnailles","sorbets","source","sources","sous","spiruline",
        "st","stade","stand","sud","sur","suscinio","table","tapiau","temporaire","temps","terferme","terra","terre","terrefort","terres","terroir","terroirs","tilleuls",
        "tisanes","tome","top","tour","touraine","tours","tout","tradition","treille","trois","truffe","truite","truites","trénube","tuilerie","tuileries","ty","tête","u","un",
        "une","urbain","urbaine","vache","vaches","val","vallon","vallons","vallée","vallées","vanille","vente","vents","verger","vergers","vert","verte","vertes","verts","viande",
        "viandes","vie","vieille","vieux","vigne","vigneron","vignerons","vignes","vignoble","vignobles","villa","village","ville","vin","vinicole","vins","vire","vivier","viviers",
        "voie","volaille","volailles","volcans","vosges","yves","z","à","écoles","ô"
    ];
    _genericNameWords = new Set(commonWordsList);
    console.log(`Pre-populated ${_genericNameWords.size} common name words from the provided list.`);
    _commonNamesInitialized = true;
}

/**
 * Normalizes a string for word extraction (lowercase, remove accents, remove special chars, trim).
 * @param str The input string.
 * @returns The normalized string.
 */
const normalizeWord = (str: string) =>
    str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9\s]/g, '') // Keep only alphanumeric and spaces
        .toLowerCase()
        .trim() || '';

/**
 * Determines if a found business is a valid match for the search query using
 * a hybrid approach: stricter keyword matching followed by LLM verification.
 * @param searchName The name searched by the user.
 * @param searchAddress The address searched by the user.
 * @param searchPostalCode The postal code searched by the user.
 * @param foundName The name of the business found by Google Places.
 * @param foundAddress The formatted address of the business found by Google Places.
 * @returns true if it's considered a valid match, false otherwise.
 */
async function isValidMatch(
    searchName: string,
    searchAddress: string,
    searchPostalCode: string,
    foundName: string,
    foundAddress: string
): Promise<boolean> {
    // 1. Basic check: Postal code must be present in the found address.
    if (!foundAddress.includes(searchPostalCode)) {
        console.log(`Mismatch: Postal code "${searchPostalCode}" not found in found address "${foundAddress}".`);
        return false;
    }

    // Helper to normalize strings for robust comparison (lowercase, remove accents, remove special chars, trim).
    const normalize = (str: string) => 
        str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-zA-Z0-9\s]/g, '') // Keep only alphanumeric and spaces
            .toLowerCase()
            .trim() || '';

    const normSearchName = normalize(searchName);
    const normFoundName = normalize(foundName);
    const normSearchAddr = normalize(searchAddress); 
    const normFoundAddr = normalize(foundAddress);

    // Filter words based ONLY on the pre-populated common words
    const commonNameWordsToFilter = _genericNameWords;
    
    const searchNameWords = normSearchName.split(/\s+/).filter(w => w.length > 2 && !commonNameWordsToFilter.has(w));
    const foundNameWords = normFoundName.split(/\s+/).filter(w => w.length > 2 && !commonNameWordsToFilter.has(w));
    
    // For address, filter out generic street types. These are general and not derived from business names.
    const commonAddressWordsToFilter = ['route', 'rue', 'avenue', 'chemin', 'impasse', 'place', 'bld', 'boulevard', 'st', 'saint', 'street', 'road', 'avenue', 'court', 'lane', 'drive', 'terrace'];
    const searchAddrWords = normSearchAddr.split(/\s+/).filter(w => w.length > 3 && !commonAddressWordsToFilter.includes(w));
    const foundAddrWords = normFoundAddr.split(/\s+/).filter(w => w.length > 3 && !commonAddressWordsToFilter.includes(w));

    // Calculate intersection of words for name.
    const nameWordIntersections = searchNameWords.filter(word => foundNameWords.includes(word));
    const nameOverlapRatio = nameWordIntersections.length / Math.max(searchNameWords.length || 1, foundNameWords.length || 1);
    
    // Adjusted: Lower threshold for strong name match (0.5 means 50% overlap of significant words)
    // This allows for "Musée du Louvre" vs "Louvre Museum" to be a strong match (1/2 = 0.5)
    const strongNameMatch = nameOverlapRatio >= 0.5;

    // Calculate intersection of words for address.
    const addrWordIntersections = searchAddrWords.filter(word => foundAddrWords.includes(word)); 
    const basicAddrWordOverlap = addrWordIntersections.length > 0 && 
                                 (addrWordIntersections.length / Math.min(searchAddrWords.length || 1, foundAddrWords.length || 1)) >= 0.3;

    // Check if the primary non-generic street name part from search is contained in the found address string.
    // This helps when Google simplifies addresses (e.g., "Rue de Rivoli" becomes just "Paris, France").
    // We pick the longest non-generic word from the search address to ensure it's significant (e.g., "Rivoli").
    const primarySearchStreetNamePart = searchAddrWords.length > 0 ? searchAddrWords.reduce((a, b) => a.length > b.length ? a : b) : ''; 
    const addressContainsSearchStreet = primarySearchStreetNamePart.length > 0 && normFoundAddr.includes(primarySearchStreetNamePart);


    console.log(`Debug Basic Match: Search Name Words: [${searchNameWords.join(', ')}], Found Name Words: [${foundNameWords.join(', ')}], Intersections: [${nameWordIntersections.join(', ')}], Overlap Ratio: ${nameOverlapRatio.toFixed(2)}`);
    console.log(`Debug Basic Match: Search Address Words: [${searchAddrWords.join(', ')}], Found Address Words: [${foundAddrWords.join(', ')}], Intersections: [${addrWordIntersections.join(', ')}]`);
    console.log(`Strong Name Match Result (>=0.5): ${strongNameMatch}`);
    console.log(`Basic Address Word Overlap Result: ${basicAddrWordOverlap}`);
    console.log(`Address Contains Search Street ("${primarySearchStreetNamePart}"): ${addressContainsSearchStreet}`);


    // 2. Determine initial match strength.
    // PRIMARY RULE: For well-known landmarks or very precise matches, a strong name match combined with the correct postal code is often sufficient.
    // This now relies on `strongNameMatch` being true *after* filtering common business types from names.
    if (strongNameMatch && foundAddress.includes(searchPostalCode)) {
        console.log("Info: Strong name match and postal code match. Considering it a valid match (primary rule).");
        return true;
    }

    // SECONDARY RULE: If the primary rule didn't hit, check for strong name match AND any relevant address hint.
    // This is useful for businesses where the name isn't *super* unique, but address details help.
    if (strongNameMatch && (basicAddrWordOverlap || addressContainsSearchStreet)) {
        console.log("Info: Strong name match and sufficient address hint. Considering it a valid match (secondary rule).");
        return true;
    }

    // 3. LLM verification for ambiguous cases or when initial strong checks are not met.
    // Engage LLM if there's at least a partial name match OR any address indication.
    // This handles cases where initial rules aren't conclusive, but there's still some relevancy.
    if (nameWordIntersections.length > 0 || basicAddrWordOverlap || addressContainsSearchStreet) { 
        if (llmMatcher) { // Only engage LLM if it was initialized successfully
            try {
                console.log("Info: Basic match not definitively strong. Engaging LLM for verification.");
                const prompt = `Are these the same business? Consider their names and addresses.
Search Business: "${searchName}, ${searchAddress}, ${searchPostalCode}"
Found Business: "${foundName}, ${foundAddress}"
Answer (YES/NO):`;
                
                const llmResult = await llmMatcher(prompt);
                const { label, score } = Array.isArray(llmResult) ? llmResult[0] : llmResult;
                
                console.log(`LLM match confidence: ${score} (Label: ${label})`);
                
                // Adjust the confidence threshold and label based on your LLM's output.
                const llmConfirmation = label.toUpperCase().includes('YES') && score > 0.85; 
                if (llmConfirmation) {
                    console.log("Info: LLM confirmed the match.");
                } else {
                    console.log("Info: LLM did not confirm the match or confidence too low.");
                }
                return llmConfirmation;
            } catch (error: any) {
                console.error("Error: LLM verification failed during inference.", error.message);
                console.error("LLM full error details:", error); 
                // Fallback if LLM fails: if we got here, it means the earlier strong checks failed too.
                // So, if LLM fails, and we didn't have a strong name+address/postal match, we return false.
                console.log("Info: LLM failed, and pre-LLM criteria not met for fallback. Rejecting.");
                return false;
            }
        } else {
            console.log("Warning: LLM was not initialized successfully. Cannot perform semantic matching. Relying solely on strict basic matching.");
            // If LLM couldn't initialize, and the very strong conditions (above) didn't hit, then it's a false match.
            return false; 
        }
    }

    console.log("Info: No sufficient match criteria met by basic checks, and LLM was not engaged or did not confirm. Rejecting.");
    return false; 
}

/**
 * Fetches detailed business information from Google Places API.
 * @param businessName The name of the business to search for.
 * @param address The address of the business.
 * @param postalCode The postal code of the business.
 * @param apiKey Your Google Maps API Key.
 * @returns A BusinessDetails object if a match is found, otherwise null.
 */
export async function getBusinessDetailsFromPlaces(
    businessName: string,
    address: string,
    postalCode: string,
    apiKey: string
): Promise<BusinessDetails | null> {
    const client = new Client({});

    try {
        // Ensure dynamic filters and LLM are initialized before proceeding with searches
        await initializeCommonNameFilters(); // This now uses the pre-defined list
        await initializeLLM(); 

        console.log(`Initiating search for: Name: "${businessName}", Address: "${address}", Postal Code: "${postalCode}"`);

        // Try multiple search query variations to maximize chances with Google Places API.
        const queries = [
            `${businessName}, ${address}, ${postalCode}`,
            `${businessName}, ${postalCode}`,
            `${businessName}, ${address}`, 
            businessName // Broadest query, might yield more candidates initially
        ];

        let candidates: any[] = [];
        for (const query of queries) {
            console.log(`Attempting Google Places API findPlaceFromText with query: "${query}"`);
            try {
                const response = await client.findPlaceFromText({
                    params: {
                        input: query,
                        inputtype: PlaceInputType.textQuery,
                        fields: ["place_id", "name", "formatted_address"], // Request minimal fields initially
                        key: apiKey,
                    },
                    timeout: 5000, // 5 seconds timeout for this call
                });

                if (response.data.candidates?.length) {
                    candidates = response.data.candidates;
                    console.log(`Found ${candidates.length} candidates for query: "${query}".`);
                    console.log("First candidate (brief):", JSON.stringify(candidates[0], null, 2));
                    break; // Stop at the first query that yields candidates
                } else {
                    console.log(`No candidates found for query: "${query}".`);
                }
            } catch (queryError: any) {
                console.error(`Error during findPlaceFromText for query "${query}":`, queryError.response?.data?.error_message || queryError.message);
                // Continue to the next query if one fails
            }
        }

        if (!candidates.length) {
            console.log("No candidates found by any Google Places API findPlaceFromText query. Returning null.");
            return null;
        }

        // Evaluate candidates for the best match using the isValidMatch logic.
        console.log(`Evaluating ${candidates.length} candidate(s) for a valid match.`);
        for (const candidate of candidates) {
            const placeId = candidate.place_id;
            if (!placeId) {
                console.log("Candidate missing 'place_id', skipping.");
                continue;
            }

            console.log(`Fetching detailed information for candidate place_id: ${placeId} (Name: "${candidate.name || 'N/A'}", Address: "${candidate.formatted_address || 'N/A'}")`);
            try {
                const detailsResponse = await client.placeDetails({
                    params: {
                        place_id: placeId,
                        // Request all necessary fields for the BusinessDetails interface
                        fields: [
                            "name", "formatted_address", "international_phone_number",
                            "website", "opening_hours", "rating", "user_ratings_total",
                            "url", "geometry" 
                        ],
                        key: apiKey,
                    },
                    timeout: 10000, // 10 seconds timeout for details call
                });

                const result = detailsResponse.data.result;
                if (!result) {
                    console.log(`No detailed result found for place_id: ${placeId}, skipping.`);
                    continue;
                }

                console.log(`Evaluating match for: Found Name: "${result.name || 'N/A'}", Found Address: "${result.formatted_address || 'N/A'}"`);
                const isValid = await isValidMatch(
                    businessName,
                    address,
                    postalCode,
                    result.name || '', // Use empty string if name is null/undefined
                    result.formatted_address || '' // Use empty string if address is null/undefined
                );

                if (isValid) {
                    console.log("Success: Valid match found and confirmed!");
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
                    console.log("Info: Candidate did not pass isValidMatch criteria. Moving to next candidate (if any).");
                }
            } catch (detailsError: any) {
                console.error(`Error fetching details for place_id ${placeId}:`, detailsError.response?.data?.error_message || detailsError.message);
                // Continue to the next candidate if one fails
            }
        }

        console.log("Result: No valid business details found after evaluating all candidates. Returning null.");
        return null;

    } catch (mainError: any) {
        console.error("Critical Error in getBusinessDetailsFromPlaces function:", mainError.response?.data?.error_message || mainError.message);
        if (mainError.response?.data) {
            console.error("Google Maps API full error details:", JSON.stringify(mainError.response.data, null, 2));
        }
        return null;
    }
}