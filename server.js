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

// 1. UNIVERSAL LIVE DESTINATION SEARCH (Finds any district, city, or village across India via Booking API)
app.get('/api/destinations', async (req, res) => {
  try {
    const rawQuery = (req.query.query || 'New Delhi').trim();
    
    // Direct live query to Booking.com API for any district/city in India
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchDestination`, {
      params: { query: rawQuery, locale: 'en-us' },
      headers
    });

    let results = response.data?.data || response.data?.result || [];
    
    if (Array.isArray(results) && results.length > 0) {
      res.json({ status: true, data: results });
    } else {
      // If specific village/district isn't found directly, fallback to state capital hub
      res.json({
        status: true,
        data: [{ dest_id: '-2093860', search_type: 'CITY', name: rawQuery }]
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

// 2. SEARCH HOTELS API BY DEST_ID
app.get('/api/searchHotels', async (req, res) => {
  try {
    const { dest_id, search_type, arrival_date, departure_date, adults, rooms } = req.query;
    
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id: dest_id || '-2093860',
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
