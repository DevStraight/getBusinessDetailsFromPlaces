// Option 1: Utiliser la bibliothèque officielle Google Maps Services (recommandé)
import { Client, LatLngLiteral } from "@googlemaps/google-maps-services-js";
import { PlaceDetailsResponseData, PlacesSearchResponseData } from "@googlemaps/google-maps-services-js/dist/places";

// Option 2: Utiliser Axios (pour une approche plus générique si vous n'utilisez pas la lib officielle)
// import axios from 'axios';

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
    // Ajoutez d'autres champs que vous souhaitez récupérer
    [key: string]: any; // Pour autoriser d'autres propriétés dynamiques
}

/**
 * Récupère les détails d'une entreprise via l'API Google Places.
 * @param businessName Le nom de l'entreprise.
 * @param address L'adresse de l'entreprise.
 * @param postalCode Le code postal de l'entreprise.
 * @param apiKey Votre clé API Google Places.
 * @returns Un objet contenant les détails de l'entreprise ou null si non trouvée/erreur.
 */
async function getBusinessDetailsFromPlaces(
    businessName: string,
    address: string,
    postalCode: string,
    apiKey: string
): Promise<BusinessDetails | null> {
    const query = `${businessName}, ${address}, ${postalCode}`;
    const client = new Client({}); // Initialise le client pour Google Maps Services

    try {
        // --- Étape 1: Effectuer une recherche de lieu pour obtenir le Place ID ---
        console.log(`Recherche du lieu pour: "${query}"`);
        const findPlaceResponse = await client.findPlaceFromText({
            params: {
                input: query,
                inputtype: "textquery",
                fields: ["place_id", "name", "formatted_address"], // Demande les champs essentiels
                key: apiKey,
            },
            timeout: 10000, // Timeout en ms
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
                // Listez ici tous les champs que vous souhaitez récupérer.
                // Attention: certains champs (comme 'reviews' ou 'photos') peuvent coûter plus cher.
                fields: [
                    "name",
                    "formatted_address",
                    "international_phone_number",
                    "website",
                    "opening_hours",
                    "rating",
                    "user_ratings_total",
                    "url", // Lien vers la fiche Google Maps
                    // "photos", // Décommenter si vous avez besoin des photos (coût supplémentaire)
                    // "review", // Décommenter si vous avez besoin des avis (coût supplémentaire)
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
                // ... ajoutez d'autres champs si récupérés
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

// --- Exemple d'utilisation ---
// Remplacez 'VOTRE_CLE_API_GOOGLE_PLACES' par votre véritable clé API Google Cloud pour Places
// et les informations de l'entreprise par celles que vous souhaitez tester.
const MY_API_KEY = "VOTRE_CLE_API_GOOGLE_PLACES";

async function runExample() {
    const businessName = "Maison de la Radio";
    const businessAddress = "Avenue du Président Kennedy";
    const businessPostalCode = "75016"; // Le code postal peut aider à affiner la recherche

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

// Appeler l'exemple pour exécuter la fonction
runExample();
