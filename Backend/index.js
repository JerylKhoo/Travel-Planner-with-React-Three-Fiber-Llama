import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Wikipedia API for Country Summary
app.get('/cities', (req, res) => {
  axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(req.query.name)}`)
  .then((response) => {
    // The REST API returns a much cleaner response structure
    res.json({
      title: response.data.title,
      extract: response.data.extract.replace(/\n/g, ''), // This is the main content
      thumbnail: response.data.thumbnail
    });
  })
  .catch((error) => {
    res.json({ error: error.message });
  });
});

// Pixabay API for destination images
app.get('/destination-images', async (req, res) => {
    try {
        const { destination } = req.query;
        const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

        if (!PIXABAY_API_KEY) {
            return res.status(500).json({ error: 'Pixabay API key not configured' });
        }

        const response = await axios.get('https://pixabay.com/api/', {
            params: {
                key: PIXABAY_API_KEY,
                q: destination,
                image_type: 'photo',
                category: 'travel',
                safesearch: true,
                per_page: 3,
                editors_choice: true
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching Pixabay images:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/travel-planner', async (req, res) => {
    try {
        const { destination, duration, pax, budget, remarks } = req.body;

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: 'Groq API key not configured' });
        }

        // Build the user prompt requesting JSON format
        let userPrompt = `Create a detailed ${duration}-day travel itinerary to ${destination} for ${pax} traveler${pax > 1 ? 's' : ''}. Budget: $${budget}.`;

        if (remarks) {
            userPrompt += ` Additional preferences: ${remarks}`;
        }

        userPrompt += `\n\nYou must respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "context": {
    "summary": "Brief overview of the trip",
    "travelers": "Description of traveler type (e.g., '${pax} travelers on a budget')"
  },
  "steps": [
    {
      "day 1": {
        "title": "Day title (e.g., 'Arrival and City Exploration')",
        "activities": {
          "1": {
            "location_name": "Eiffel Tower",
            "location_address": "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France",
            "location_latitude": "48.8584",
            "location_longitude": "2.2945",
            "location_description": "Iconic iron lattice tower and symbol of Paris",
            "notes": "Opening hours 9:30 AM - 11:45 PM, book tickets in advance"
          },
          "2": {
            "location_name": "Louvre Museum",
            "location_address": "Rue de Rivoli, 75001 Paris, France",
            "location_latitude": "48.8606",
            "location_longitude": "2.3376",
            "location_description": "World's largest art museum housing the Mona Lisa",
            "notes": "Closed on Tuesdays, arrive early to avoid crowds"
          }
        }
      }
    }
  ],
  "tips": [
    "Practical timing tips for the trip",
    "Packing suggestions",
    "Cultural etiquette advice"
  ]
}

Create ${duration} days in the "steps" array. Include multiple activities per day covering morning, afternoon, and evening. Provide practical timing tips and useful resources.`;

        console.log('Generating itinerary with Groq for:', { destination, duration, pax, budget });

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert travel planner API. You MUST respond with ONLY valid JSON, no markdown formatting, no code blocks, no additional text. Return raw JSON that can be parsed directly.'
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 4096,
            response_format: { type: "json_object" }
        });

        const itineraryContent = chatCompletion.choices[0]?.message?.content;

        if (!itineraryContent) {
            throw new Error('No content received from Groq');
        }

        // Parse the JSON response
        let itinerary;
        try {
            itinerary = JSON.parse(itineraryContent);
        } catch (parseError) {
            console.error('Failed to parse itinerary JSON:', parseError);
            console.error('Raw content:', itineraryContent);
            throw new Error('Failed to parse itinerary response');
        }

        console.log('Itinerary generated successfully');

        res.json({ itinerary });
    } catch (error) {
        console.error('Error generating itinerary:', error);
        res.status(500).json({
            error: error.message || 'Failed to generate itinerary',
            details: error.response?.data || error.toString()
        });
    }
});

// Hardcoded airport code mapping
const AIRPORT_CODES = {
    "Singapore": "SIN",
    "Osaka": "KIX",
    "Beijing": "PEK",
    "Tokyo": "NRT",
    "Bangkok": "BKK",
    "Seoul": "ICN",
    "Shanghai": "PVG",
    "Hong Kong": "HKG",
    "Taipei": "TPE",
    "Kuala Lumpur": "KUL",
    "Dubai": "DXB",
    "London": "LHR",
    "Paris": "CDG",
    "New York": "JFK",
    "Los Angeles": "LAX",
    "Sydney": "SYD",
    "Melbourne": "MEL",
    "Jakarta": "CGK",
    "Manila": "MNL",
    "Ho Chi Minh City": "SGN",
    "Hanoi": "HAN",
    "Bali": "DPS",
    "Phuket": "HKT",
    "Chiang Mai": "CNX",
    "Mumbai": "BOM",
    "Delhi": "DEL",
    "Istanbul": "IST",
    "Rome": "FCO",
    "Amsterdam": "AMS",
    "Frankfurt": "FRA",
    "Zurich": "ZRH",
    "Barcelona": "BCN",
    "Madrid": "MAD",
    "Berlin": "BER",
    "Vienna": "VIE",
    "Prague": "PRG",
    "Copenhagen": "CPH",
    "Stockholm": "ARN",
    "Oslo": "OSL",
    "Helsinki": "HEL",
    "Athens": "ATH",
    "Lisbon": "LIS",
    "Toronto": "YYZ",
    "Vancouver": "YVR",
    "Montreal": "YUL",
    "Chicago": "ORD",
    "San Francisco": "SFO",
    "Las Vegas": "LAS",
    "Miami": "MIA",
    "Boston": "BOS",
    "Seattle": "SEA",
    "Washington": "IAD",
    "Mexico City": "MEX",
    "Cancun": "CUN",
    "Sao Paulo": "GRU",
    "Rio de Janeiro": "GIG",
    "Buenos Aires": "EZE",
    "Lima": "LIM",
    "Santiago": "SCL",
    "Bogota": "BOG",
    "Auckland": "AKL",
    "Wellington": "WLG",
    "Christchurch": "CHC",
    "Perth": "PER",
    "Brisbane": "BNE",
    "Adelaide": "ADL",
    "Doha": "DOH",
    "Abu Dhabi": "AUH",
    "Riyadh": "RUH",
    "Jeddah": "JED",
    "Tel Aviv": "TLV",
    "Cairo": "CAI",
    "Johannesburg": "JNB",
    "Cape Town": "CPT",
    "Nairobi": "NBO",
    "Addis Ababa": "ADD",
    "Casablanca": "CMN"
};

/**
 * Convert city name to airport code using hardcoded mapping
 * @param {string} cityName - City name to convert (e.g., "Osaka", "Paris")
 * @returns {string|null} Airport code (e.g., "KIX", "CDG") or null if not found
 */
function convertCityToAirportCode(cityName) {
    if (!cityName) {
        console.warn('Empty city name provided');
        return null;
    }

    // Check if it's already an airport code (3 uppercase letters)
    if (/^[A-Z]{3}$/.test(cityName)) {
        console.log(`"${cityName}" is already an airport code`);
        return cityName;
    }

    const cleanedCityName = cityName.trim();

    // Look up in hardcoded mapping (case-sensitive)
    if (AIRPORT_CODES[cleanedCityName]) {
        const airportCode = AIRPORT_CODES[cleanedCityName];
        console.log(`✅ Converted "${cityName}" to airport code: ${airportCode}`);
        return airportCode;
    }

    // Try case-insensitive lookup
    const cityKey = Object.keys(AIRPORT_CODES).find(
        key => key.toLowerCase() === cleanedCityName.toLowerCase()
    );

    if (cityKey) {
        const airportCode = AIRPORT_CODES[cityKey];
        console.log(`✅ Converted "${cityName}" to airport code: ${airportCode}`);
        return airportCode;
    }

    console.error(`❌ Airport code not found for "${cityName}". Please add it to AIRPORT_CODES mapping.`);
    return null;
}

// SERP API for flight search
app.get('/flights', async (req, res) => {
    try {
        const { origin, destination, departureDate, returnDate, adults = 1, currency = 'USD', departure_token } = req.query;
        const SERP_API_KEY = process.env.SERP_API_KEY;

        if (!SERP_API_KEY) {
            return res.status(500).json({ error: 'SERP API key not configured' });
        }

        // If departure_token is provided, use it to get return flights for a specific outbound flight
        if (departure_token) {
            console.log('=== Return Flight Search Using Departure Token ===');
            console.log('Departure token:', departure_token);

            // Even with departure_token, SERP API requires all original parameters
            if (!origin || !destination || !departureDate || !returnDate) {
                return res.status(400).json({
                    error: 'Missing required parameters: origin, destination, departureDate, returnDate are required even with departure_token'
                });
            }

            // Convert city names to airport codes
            console.log('Converting city names to airport codes...');
            const originCode = convertCityToAirportCode(origin);
            const destinationCode = convertCityToAirportCode(destination);

            if (!originCode || !destinationCode) {
                return res.status(400).json({
                    error: 'Failed to convert city names to airport codes',
                    details: `Origin: ${originCode || 'NOT FOUND'}, Destination: ${destinationCode || 'NOT FOUND'}`
                });
            }

            console.log('Converted to airport codes:', { originCode, destinationCode });

            // Build SERP API params with departure_token AND all original search parameters
            const params = {
                engine: 'google_flights',
                departure_id: originCode,
                arrival_id: destinationCode,
                outbound_date: departureDate,
                return_date: returnDate,
                departure_token: departure_token,
                type: '1', // Round trip
                adults: parseInt(adults) || 1,
                currency: currency,
                gl: 'us',
                hl: 'en',
                api_key: SERP_API_KEY
            };

            console.log('SERP API params with departure_token:', JSON.stringify(params, null, 2));

            const response = await axios.get('https://serpapi.com/search', {
                params: params
            });

            console.log('✅ Return flights fetched successfully using departure_token');
            res.json(response.data);
            return;
        }

        // Standard flight search (without departure_token)
        if (!origin || !destination || !departureDate) {
            return res.status(400).json({ error: 'Missing required parameters: origin, destination, departureDate' });
        }

        console.log('=== Flight Search Request ===');
        console.log('Searching flights for:', { origin, destination, departureDate, returnDate, adults });

        // Validate and format dates (YYYY-MM-DD format)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(departureDate)) {
            return res.status(400).json({ error: 'Invalid departure date format. Expected YYYY-MM-DD' });
        }

        // Validate return date if provided
        if (returnDate && returnDate !== 'null' && returnDate !== 'undefined' && !dateRegex.test(returnDate)) {
            return res.status(400).json({ error: 'Invalid return date format. Expected YYYY-MM-DD' });
        }

        // Convert city names to airport codes
        console.log('Converting city names to airport codes...');
        const originCode = convertCityToAirportCode(origin);
        const destinationCode = convertCityToAirportCode(destination);

        if (!originCode || !destinationCode) {
            return res.status(400).json({
                error: 'Failed to convert city names to airport codes',
                details: `Origin: ${originCode || 'NOT FOUND'}, Destination: ${destinationCode || 'NOT FOUND'}`
            });
        }

        console.log('Converted to airport codes:', { originCode, destinationCode });

        // Build parameters for SERP API Google Flights
        const params = {
            engine: 'google_flights',
            departure_id: originCode,
            arrival_id: destinationCode,
            outbound_date: departureDate,
            adults: parseInt(adults) || 1,
            currency: currency,
            gl: 'us',
            hl: 'en',
            api_key: SERP_API_KEY
        };

        // Add return date if provided (for round-trip flights)
        if (returnDate && returnDate !== 'null' && returnDate !== 'undefined') {
            params.return_date = returnDate;
            params.type = '1'; // Round trip
        } else {
            params.type = '2'; // One way
        }

        console.log('SERP API Google Flights params:', JSON.stringify(params, null, 2));

        const response = await axios.get('https://serpapi.com/search', {
            params: params
        });

        console.log('✅ Flights search successful');
        console.log(`Found ${(response.data.best_flights?.length || 0) + (response.data.other_flights?.length || 0)} flights`);

        // Log departure_token availability for debugging
        const hasTokens = response.data.best_flights?.some(f => f.departure_token) ||
                         response.data.other_flights?.some(f => f.departure_token);
        console.log('Departure tokens available:', hasTokens);
        if (hasTokens) {
            console.log('Sample departure_token:',
                response.data.best_flights?.[0]?.departure_token ||
                response.data.other_flights?.[0]?.departure_token
            );
        }

        // Include airport codes in response for frontend to use
        res.json({
            ...response.data,
            search_metadata: {
                ...response.data.search_metadata,
                origin_city: origin,
                origin_code: originCode,
                destination_city: destination,
                destination_code: destinationCode
            }
        });
    } catch (error) {
        console.error('❌ Error fetching flights:', error.message);

        // Log more details about the error
        if (error.response) {
            console.error('SERP API Error Response:', error.response.data);
            console.error('Status:', error.response.status);
        }

        res.status(500).json({
            error: error.message || 'Failed to fetch flights',
            details: error.response?.data || error.toString()
        });
    }
});

// SERP API for hotel search
app.get('/hotels', async (req, res) => {
    try {
        const { destination, checkIn, checkOut, guests, currency = 'USD' } = req.query;
        const SERP_API_KEY = process.env.SERP_API_KEY;

        if (!SERP_API_KEY) {
            return res.status(500).json({ error: 'SERP API key not configured' });
        }

        if (!destination || !checkIn || !checkOut) {
            return res.status(400).json({ error: 'Missing required parameters: destination, checkIn, checkOut' });
        }

        console.log('Searching hotels for:', { destination, checkIn, checkOut, guests });

        const response = await axios.get('https://serpapi.com/search', {
            params: {
                engine: 'google_hotels',
                q: destination,
                check_in_date: checkIn,
                check_out_date: checkOut,
                adults: guests || 2,
                currency: currency,
                gl: 'us',
                hl: 'en',
                api_key: SERP_API_KEY
            }
        });

        console.log('Hotels search successful');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch hotels',
            details: error.response?.data || error.toString()
        });
    }
});

app.listen(PORT, () => {
    console.log('Server running on port 3000');
});
