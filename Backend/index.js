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
        "activities": [
          1: {
            "location_name": "(e.g. 'Eiffel Tower')",
            "location_address": "(e.g. 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France')",
            "location_latitude": "Location Lattitude",
            "location_longitude": "Location Longtitude",
            "location_description": "Location Description (Short 2 liner)"
            "notes": "Additional notes (e.g., opening hours, ticket info)"
          },
          2: {
            "location_name": "(e.g. 'Eiffel Tower')",
            "location_address": "(e.g. 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France')",
            "location_latitude": "Location Lattitude",
            "location_longitude": "Location Longtitude",
            "location_description": "Location Description (Short 2 liner)"
            "notes": "Additional notes (e.g., opening hours, ticket info)"
          }
        ],
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

app.listen(PORT, () => {
    console.log('Server running on port 3000');
});