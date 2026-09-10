const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Environment Variable se Key uthayega
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "booking-com15.p.rapidapi.com";

// 🏨 Hotel Search API Proxy Route
app.get('/api/hotels', async (req, res) => {
  try {
    const { city, checkin, checkout } = req.query;

    if (!city) return res.status(400).json({ error: "City is required" });

    // Step 1: Destination ID Fetch
    const destRes = await axios.get(`https://${RAPIDAPI_HOST}/api/v1/hotels/searchDestination`, {
      params: { query: city },
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });

    if (!destRes.data.data || destRes.data.data.length === 0) {
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
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });

    res.json(hotelRes.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch hotels from RapidAPI", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
