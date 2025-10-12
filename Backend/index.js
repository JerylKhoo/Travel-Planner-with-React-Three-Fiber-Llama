import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let model;
let context;
let session;

async function loadModel() {
    console.log('Loading GGUF model...');
    const llama = await getLlama();

    model = await llama.loadModel({
        modelPath: './Llama-3.1-8B-Instruct-travelplanner-SFT.i1-Q4_K_M.gguf'
    });

    context = await model.createContext();
    session = new LlamaChatSession({
        contextSequence: context.getSequence()
    });

    console.log('Model loaded successfully!');
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
        const { destination, duration, budget, interests } = req.body;

        const prompt = `Create a ${duration}-day travel itinerary for ${destination}. Budget: ${budget}. Interests: ${interests}.`;

        console.log('Generating response for:', prompt);

        const response = await session.prompt(prompt);

        console.log('Response:', response);

        res.json({ itinerary: response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

loadModel().then(() => {
    app.listen(PORT, () => {
        console.log('Server running on port 3000');
    });
});