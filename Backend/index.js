import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS to allow requests from your frontend
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://travel-planner-with-react-three-fib-beige.vercel.app',
    'https://jet3holiday.vercel.app/',
    // Add your deployed frontend URL here when you deploy
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || origin?.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Image cache for proxy endpoint (24-hour expiration)
const imageCache = new Map();

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


app.get('/proxy-image', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Check cache first
        const now = Date.now();
        const cached = imageCache.get(url);

        if (cached && cached.expiresAt > now) {
            console.log('Serving cached image for:', url.substring(0, 80) + '...');
            res.set('Content-Type', cached.contentType);
            res.set('Cache-Control', 'public, max-age=86400');
            res.set('X-Cache', 'HIT');
            return res.send(cached.buffer);
        }

        console.log('Fetching image from Google:', url.substring(0, 80) + '...');

        // Fetch with retry logic (2 attempts)
        let lastError;
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                        'Referer': 'https://www.google.com/',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br'
                    },
                    timeout: 15000
                });

                const contentType = response.headers['content-type'] || 'image/jpeg';
                const buffer = response.data;

                // Cache the image for 24 hours
                imageCache.set(url, {
                    buffer,
                    contentType,
                    expiresAt: now + (24 * 60 * 60 * 1000)
                });

                console.log('✓ Successfully fetched and cached image');

                // Send response
                res.set('Content-Type', contentType);
                res.set('Cache-Control', 'public, max-age=86400');
                res.set('X-Cache', 'MISS');
                return res.send(buffer);

            } catch (err) {
                lastError = err;
                if (attempt < 2 && err.response?.status === 429) {
                    // Wait before retry (exponential backoff)
                    const delay = Math.pow(2, attempt) * 500;
                    console.log(`Attempt ${attempt} failed with 429, retrying after ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    break;
                }
            }
        }

        // Both attempts failed
        const status = lastError.response?.status || 500;
        console.error(`✗ Failed to proxy image after retries. Status: ${status}, URL: ${url.substring(0, 80)}...`);
        console.error('Error details:', lastError.message);

        res.status(status).json({
            error: 'Failed to fetch image',
            status: status,
            message: lastError.message
        });

    } catch (error) {
        console.error('Unexpected error in proxy-image:', error.message);
        res.status(500).json({ error: 'Internal server error' });
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

// Cache for airport codes to minimize API calls
const airportCodeCache = {};

// Hardcoded airport code mapping (fallback)
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
    "Casablanca": "CMN",
    // Additional US cities
    "Philadelphia": "PHL",
    "Houston": "IAH",
    "Phoenix": "PHX",
    "Denver": "DEN",
    "Atlanta": "ATL",
    "Dallas": "DFW",
    "Minneapolis": "MSP",
    "Detroit": "DTW",
    "Portland": "PDX",
    "Orlando": "MCO",
    "Tampa": "TPA",
    "Charlotte": "CLT",
    "Salt Lake City": "SLC",
    "Nashville": "BNA",
    "Austin": "AUS",
    "San Diego": "SAN",
    "Honolulu": "HNL",
    "Anchorage": "ANC",
    // Additional European cities
    "Edinburgh": "EDI",
    "Nice": "NCE",
    "Krakow": "KRK",
    "Budapest": "BUD",
    "Porto": "OPO",
    "Valencia": "VLC",
    "Seville": "SVQ",
    "Brussels": "BRU",
    "Geneva": "GVA",
    "Milan": "MXP",
    "Venice": "VCE",
    "Florence": "FLR",
    "Naples": "NAP",
    "Dublin": "DUB",
    "Manchester": "MAN",
    "Glasgow": "GLA",
    // Additional Asian cities
    "Bengaluru": "BLR",
    "Bangalore": "BLR",
    "Chennai": "MAA",
    "Kolkata": "CCU",
    "Hyderabad": "HYD",
    "Kathmandu": "KTM",
    "Colombo": "CMB",
    "Dhaka": "DAC"
};

/**
 * Convert city name to airport code using Google Places API with fallback to hardcoded mapping
 * @param {string} cityName - City name to convert (e.g., "Osaka", "Paris")
 * @returns {Promise<string|null>} Airport code (e.g., "KIX", "CDG") or null if not found
 */
async function convertCityToAirportCode(cityName) {
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
    const cacheKey = cleanedCityName.toLowerCase();

    // Check cache first
    if (airportCodeCache[cacheKey]) {
        console.log(`✅ Found "${cityName}" in cache: ${airportCodeCache[cacheKey]}`);
        return airportCodeCache[cacheKey];
    }

    // Try Google Places API first
    // Try multiple possible environment variable names
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

    if (GOOGLE_API_KEY) {
        try {
            console.log(`🌐 Looking up "${cityName}" via Google Places API...`);

            // Try multiple search queries to find the airport
            const searchQueries = [
                `${cleanedCityName} international airport`,
                `${cleanedCityName} airport`,
                `${cleanedCityName} municipal airport`,
                `airport ${cleanedCityName}`
            ];

            for (const searchQuery of searchQueries) {
                const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                    params: {
                        address: searchQuery,
                        key: GOOGLE_API_KEY
                    }
                });

                if (response.data.status === 'OK' && response.data.results.length > 0) {
                    // Look for airport in results
                    for (const result of response.data.results) {
                        // Check if it's an airport
                        if (result.types.includes('airport')) {
                            // Extract IATA code from the result
                            // Google often includes it in formatted_address or address_components

                            // Method 1: Look in formatted_address for 3-letter codes
                            const addressText = result.formatted_address;
                            // Match patterns like "DEN", "(DEN)", "DEN -", etc.
                            const iataInAddress = addressText.match(/\b([A-Z]{3})\b/g);

                            // Method 2: Look in place name
                            const nameText = result.address_components.find(
                                c => c.types.includes('premise') || c.types.includes('establishment')
                            )?.long_name || '';
                            const iataInName = nameText.match(/\b([A-Z]{3})\b/g);

                            // Combine both sources
                            const potentialCodes = [...(iataInAddress || []), ...(iataInName || [])];

                            if (potentialCodes.length > 0) {
                                // Take the first 3-letter code (usually the IATA code)
                                const airportCode = potentialCodes[0];
                                console.log(`✅ Found airport code via Google API: ${airportCode} for "${searchQuery}"`);

                                // Cache the result
                                airportCodeCache[cacheKey] = airportCode;
                                return airportCode;
                            }
                        }
                    }
                }
            }

            console.log(`⚠️ No airport IATA code found in Google results for "${cityName}"`);
        } catch (error) {
            console.warn(`⚠️ Google Places API error: ${error.message}`);
        }
    } else {
        console.log(`⚠️ Google Maps API key not found in environment variables, skipping Google API lookup`);
    }

    // Fallback to hardcoded mapping
    console.log(`📚 Falling back to hardcoded mapping for "${cityName}"`);

    // Look up in hardcoded mapping (case-sensitive)
    if (AIRPORT_CODES[cleanedCityName]) {
        const airportCode = AIRPORT_CODES[cleanedCityName];
        console.log(`✅ Found in hardcoded mapping: ${airportCode}`);
        airportCodeCache[cacheKey] = airportCode;
        return airportCode;
    }

    // Try case-insensitive lookup
    const cityKey = Object.keys(AIRPORT_CODES).find(
        key => key.toLowerCase() === cleanedCityName.toLowerCase()
    );

    if (cityKey) {
        const airportCode = AIRPORT_CODES[cityKey];
        console.log(`✅ Found in hardcoded mapping (case-insensitive): ${airportCode}`);
        airportCodeCache[cacheKey] = airportCode;
        return airportCode;
    }

    console.error(`❌ Airport code not found for "${cityName}". Neither Google API nor hardcoded mapping found a match.`);
    return null;
}

// SERP API for flight search
app.get('/flights', async (req, res) => {
    try {
        const { origin, destination, departureDate, returnDate, adults = 1, currency = 'SGD', departure_token } = req.query;
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
            const originCode = await convertCityToAirportCode(origin);
            const destinationCode = await convertCityToAirportCode(destination);

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
        const originCode = await convertCityToAirportCode(origin);
        const destinationCode = await convertCityToAirportCode(destination);

        if (!originCode || !destinationCode) {
            return res.status(400).json({
                error: 'Failed to convert city names to airport codes',
                details: `Origin: ${originCode || 'NOT FOUND'}, Destination: ${destinationCode || 'NOT FOUND'}`
            });
        }

        console.log('Converted to airport codes:', { originCode, destinationCode });

        // Build parameters for SERP API Google Flights - ONE-WAY only
        const params = {
            engine: 'google_flights',
            departure_id: originCode,
            arrival_id: destinationCode,
            outbound_date: departureDate,
            type: '2', // One way
            adults: parseInt(adults) || 1,
            currency: currency,
            gl: 'sg', // Singapore for SGD currency
            hl: 'en',
            api_key: SERP_API_KEY
        };

        console.log('➡️  Searching ONE-WAY flights (type=2) with currency:', currency);

        console.log('SERP API Google Flights params:', JSON.stringify(params, null, 2));

        const response = await axios.get('https://serpapi.com/search', {
            params: params
        });

        console.log('✅ Flights search successful');
        console.log(`Found ${(response.data.best_flights?.length || 0) + (response.data.other_flights?.length || 0)} flights`);

        // Log sample flight prices and durations from SERP API
        const allFlightsData = [
            ...(response.data.best_flights || []),
            ...(response.data.other_flights || [])
        ];
        console.log('📊 Sample flights from SERP API:');
        allFlightsData.slice(0, 3).forEach((flight, i) => {
            const firstSegment = flight.flights?.[0];
            console.log(`  ${i + 1}. ${firstSegment?.airline || 'Unknown'}: ${currency} ${flight.price}, ${flight.total_duration}min`);
        });

        // Log available booking fields
        console.log('\n🔗 Checking for booking URLs/tokens:');
        const firstFlight = allFlightsData[0];
        if (firstFlight) {
            console.log('Available fields:', Object.keys(firstFlight).join(', '));
            if (firstFlight.booking_token) console.log('✓ booking_token available:', firstFlight.booking_token.substring(0, 50) + '...');
            if (firstFlight.departure_token) console.log('✓ departure_token available:', firstFlight.departure_token.substring(0, 50) + '...');
            if (firstFlight.booking) console.log('✓ booking object available');
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
        })
    }
});

// Flights Search API using SerpApi
app.get('/flights', async (req, res) => {
    try {
        const { origin, destination, outbound_date, return_date, adults = 1 } = req.query;

        // Validate required parameters
        if (!origin || !destination || !outbound_date || !return_date) {
            return res.status(400).json({
                error: 'Missing required parameters: origin, destination, outbound_date, return_date'
            });
        }

        console.log(`Searching flights: ${origin} -> ${destination}`);
        console.log(`Dates: ${outbound_date} to ${return_date}, Adults: ${adults}`);

        // Make request to SerpApi
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                engine: 'google_flights',
                departure_id: origin,
                arrival_id: destination,
                outbound_date: outbound_date,
                return_date: return_date,
                adults: adults,
                currency: 'USD',
                hl: 'en',
                api_key: process.env.SERPAPI_KEY
            }
        });

        // Extract flight data
        const flightData = {
            best_flights: response.data.best_flights || [],
            other_flights: response.data.other_flights || [],
            price_insights: response.data.price_insights || null
        };

        console.log(`Found ${flightData.best_flights.length} best flights, ${flightData.other_flights.length} other flights`);

        res.json(flightData);
    } catch (error) {
        console.error('Error fetching flights:', error.message);
        res.status(500).json({
            error: 'Failed to fetch flight data',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log('Server running on port 3000');
});
