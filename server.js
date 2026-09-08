const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

app.get('/api/reviews', async (req, res) => {
  try {
    const response = await axios.get('https://booking-com21.p.rapidapi.com/api/v1/attraction/getAttractionReviews', {
      headers: {
        'x-rapidapi-host': 'booking-com21.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
