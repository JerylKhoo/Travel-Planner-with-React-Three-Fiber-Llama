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
