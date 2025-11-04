import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let model;
let context;
let session;
let modelLoaded = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const modelPath = join(__dirname, 'Llama-3.1-8B-Instruct-travelplanner-SFT.i1-Q4_K_M.gguf');

async function loadModel() {
    // Check if model file exists
    if (!existsSync(modelPath)) {
        console.log('⚠️  Model file not found. Running in MOCK mode.');
        console.log('Expected path:', modelPath);
        console.log('The /travel-planner endpoint will return mock responses.');
        modelLoaded = false;
        return;
    }

    try {
        console.log('Loading GGUF model...');
        const llama = await getLlama();

        model = await llama.loadModel({
            modelPath: modelPath
        });

        context = await model.createContext();
        session = new LlamaChatSession({
            contextSequence: context.getSequence()
        });

        modelLoaded = true;
        console.log('✅ Model loaded successfully!');
    } catch (error) {
        console.error('❌ Error loading model:', error.message);
        console.log('Running in MOCK mode instead.');
        modelLoaded = false;
    }
}

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

app.post('/travel-planner', async (req, res) => {
    try {
        const { destination, duration, pax, budget, remarks } = req.body;

        const prompt = `Create a ${duration}-day travel itinerary to ${destination}, for ${pax}. Budget: ${budget}. Remarks: ${remarks}.`;

        console.log('Generating response for:', prompt);

        let response;

        if (modelLoaded && session) {
            // Use actual AI model
            response = await session.prompt(prompt);
        } else {
            // Return mock response when model is not available
            response = `🌍 MOCK ITINERARY for ${destination} (${duration} days)\n\n` +
                `This is a placeholder response since the AI model is not loaded.\n\n` +
                `Day 1: Arrival and city orientation\n` +
                `- Check into hotel\n` +
                `- Explore local neighborhood\n` +
                `- Welcome dinner at local restaurant\n\n` +
                `Day 2-${duration - 1}: Exploration and activities\n` +
                `- Visit major attractions\n` +
                `- Try local cuisine\n` +
                `- Cultural experiences\n\n` +
                `Day ${duration}: Departure\n` +
                `- Last minute shopping\n` +
                `- Return home with memories\n\n` +
                `Budget: $${budget} for ${pax} traveler${pax > 1 ? 's' : ''}\n` +
                `Additional notes: ${remarks || 'None'}\n\n` +
                `To get AI-generated itineraries, please add the Llama model file to the Backend folder.`;
        }

        console.log('Response:', response);

        res.json({ itinerary: response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
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

loadModel().then(() => {
    app.listen(PORT, () => {
        console.log('Server running on port 3000');
    });
}).catch((error) => {
    // If model loading fails completely, still start the server
    console.error('Model loading failed, but starting server anyway:', error.message);
    app.listen(PORT, () => {
        console.log('Server running on port 3000 (MOCK mode)');
    });
});
