import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = 3000;


app.use(cors());

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

app.listen(PORT, () => {
  console.log('Server running on port 3000');
});