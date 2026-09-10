const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "booking-com15.p.rapidapi.com";

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

    const destData = destRes.data && destRes.data.data ? destRes.data.data : [];
    if (destData.length === 0) {
      return res.status(404).json({ error: "City/Destination not found in API database" });
    }

    // Exact dest_id and search_type extract
    const destId = destData[0].dest_id;
    const searchType = destData[0].search_type || destData[0].dest_type || "city";

    // Step 2: Hotel Search
    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id: destId,
        search_type: searchType,
        arrival_date: checkin,
        departure_date: checkout,
        adults: '2',
        room_qty: '1',
        page_number: '1',
        units: 'metric',
        temperature_unit: 'c',
        languagecode: 'en-us',
        currency_code: 'INR'
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    res.json(hotelRes.data);

  } catch (err) {
    console.error("Backend API Error:", err.response ? err.response.data : err.message);
    res.status(500).json({ 
      error: "API Request Failed", 
      details: err.response ? err.response.data : err.message 
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
