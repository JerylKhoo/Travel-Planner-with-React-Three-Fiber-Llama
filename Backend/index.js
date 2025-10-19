import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// app.post("/travel-planner", async (req, res) => {
//   try {
//     const { destination, duration, pax, budget, remarks } = req.body;

//     // Build the prompt for Gemini
//     const prompt = `
//     You are an intelligent travel planner. 
//     Create a detailed ${duration}-day travel itinerary for ${pax} people visiting ${destination}.
//     Consider a total budget of ${budget}.
//     Include morning, afternoon, and evening activities for each day, with short descriptions.
//     ${remarks ? "Additional preferences: " + remarks : ""}
//     Format clearly with days and highlights.
//     `;

//     // Access the generative model
//     const model = genAI.getGenerativeModel({ model: process.env.MODEL });

//     // Generate text
//     const result = await model.generateContent(prompt);
//     const itinerary = result.response.text();

//     console.log('Generated itinerary:', itinerary);


//     res.json({ itinerary });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Error generating itinerary" });
//   }
// });

app.post('/travel-planner', async (req, res) => {
  const { destination, duration, pax, budget, remarks } = req.body;

  const prompt = `You are an intelligent travel planner.
  Create a detailed ${duration}-day travel itinerary for ${pax} people visiting ${destination}.
  The total budget is ${budget}.
  Include morning, afternoon, and evening activities for each day with short descriptions.
  ${remarks ? 'Additional preferences: ' + remarks + '.' : ''}

  Return ONLY a valid JSON object that follows the COSTAR framework with the shape below (no prose, no markdown fences):
  {
    "context": {
      "summary": "...",
      "travelers": "...",
      "budgetNotes": "..."
    },
    "objective": "...",
    "steps": [
      {
        "day": 1,
        "title": "...",
        "activities": [
          {
            "timeOfDay": "morning",
            "name": "...",
            "description": "...",
            "location": "...",
            "estimatedCost": "..."
          }
        ],
        "notes": ["..."]
      }
    ],
    "timing": [
      {
        "tip": "...",
        "details": "..."
      }
    ],
    "analysis": [
      {
        "theme": "...",
        "insight": "..."
      }
    ],
    "resources": [
      {
        "label": "...",
        "type": "...",
        "url": "...",
        "notes": "..."
      }
    ]
  }

  Ensure arrays have meaningful entries for the trip duration. Do not wrap the JSON in markdown or prose, and do not include comments.`;

  try {
    const model = genAI.getGenerativeModel({ model: process.env.MODEL });

    const result = await model.generateContent(prompt);

    const rawText = result.response.text().trim();
    const cleanedText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    let itinerary;

    try {
      itinerary = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse itinerary JSON:', rawText);
      throw new Error('Model returned invalid JSON. Please try again.');
    }

    res.json({ itinerary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(3000, () => console.log("✅ Gemini backend running on port 3000"));


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
