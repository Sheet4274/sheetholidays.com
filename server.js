require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HOST = 'booking-com15.p.rapidapi.com';
const headers = {
  'x-rapidapi-host': HOST,
  'x-rapidapi-key': process.env.RAPIDAPI_KEY
};

// 1. DYNAMIC DESTINATION SEARCH (Finds any village, town or city worldwide)
app.get('/api/destinations', async (req, res) => {
  try {
    const query = req.query.query || 'Goa';
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchDestination`, {
      params: { query, locale: 'en-us' },
      headers
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

// 2. SEARCH HOTELS USING DYNAMIC DEST_ID
app.get('/api/searchHotels', async (req, res) => {
  try {
    const { dest_id, search_type, arrival_date, departure_date, adults, rooms } = req.query;
    
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id: dest_id || '-2092174', // Default Goa
        search_type: search_type || 'CITY',
        arrival_date: arrival_date || '2026-10-01',
        departure_date: departure_date || '2026-10-05',
        adults: adults || '2',
        room_qty: rooms || '1',
        currency_code: 'INR'
      },
      headers
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

// 3. TRENDING HOTELS (Default Showcase)
app.get('/api/trendingHotels', async (req, res) => {
  try {
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id: '-2092174', // Goa default showcase
        search_type: 'CITY',
        arrival_date: '2026-10-01',
        departure_date: '2026-10-05',
        adults: '2',
        room_qty: '1',
        currency_code: 'INR'
      },
      headers
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
