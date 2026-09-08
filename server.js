const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/reviews', async (req, res) => {
  try {
    // Hotel Search Endpoint (Sahi aur Working Parameters ke saath)
    const response = await axios.get('https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination', {
      params: {
        query: 'Delhi'
      },
      headers: {
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: error.message, 
      details: error.response ? error.response.data : 'No details' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
