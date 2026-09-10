const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());

// Public static files serve karne ke liye
app.use(express.static(path.join(__dirname, 'public')));

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "booking-com15.p.rapidapi.com";

// 🏨 Hotel API Route
app.get('/api/hotels', async (req, res) => {
  try {
    const { city, checkin, checkout } = req.query;

    if (!city) return res.status(400).json({ error: "City is required" });

    // Step 1: Destination Search
    const destRes = await axios.get(`https://${RAPIDAPI_HOST}/api/v1/hotels/searchDestination`, {
      params: { query: city },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    if (!destRes.data || !destRes.data.data || destRes.data.data.length === 0) {
      return res.status(404).json({ error: "Destination not found" });
    }

    const destId = destRes.data.data[0].dest_id;
    const searchType = destRes.data.data[0].search_type || "city";

    // Step 2: Hotel Search
    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id: destId,
        search_type: searchType,
        arrival_date: checkin,
        departure_date: checkout,
        adults: '2',
        room_qty: '1',
        page_number: '1'
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    res.json(hotelRes.data);

  } catch (err) {
    console.error("Backend Error:", err.message);
    res.status(500).json({ 
      error: "API Call Failed", 
      details: err.response ? err.response.data : err.message 
    });
  }
});

// 🌐 Catch-All Route (Fixes "Cannot GET /" Issue)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
