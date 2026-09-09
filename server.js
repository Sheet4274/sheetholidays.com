// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors()); // CORS Bypass

app.get('/api/hotels', async (req, res) => {
  const { destination, checkin, checkout, adults, rooms } = req.query;

  try {
    // Apne RapidAPI ya Agoda API key aur Host lagayein
    const options = {
      method: 'GET',
      url: 'https://agoda-com.p.rapidapi.com/hotels/search', // Apne endpoint according update karein
      params: { destination, checkin, checkout, adults, rooms },
      headers: {
        'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY_HERE',
        'x-rapidapi-host': 'agoda-com.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    res.json({ status: true, data: response.data });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));
