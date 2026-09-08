const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/reviews', async (req, res) => {
  try {
    const response = await axios.get('https://booking-com21.p.rapidapi.com/api/v1/attraction/getAttractionReviews', {
      params: {
        // Query parameters (RapidAPI ke requirements ke hisab se)
        id: req.query.id || '1'
      },
      headers: {
        'x-rapidapi-host': 'booking-com21.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    // Exact RapidAPI error response send karega
    res.status(500).json({ 
      error: error.message, 
      details: error.response ? error.response.data : 'No additional details' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
