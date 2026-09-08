const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HOST = 'booking-com15.p.rapidapi.com';

// Safe headers extraction so it never crashes if env is missing
const getHeaders = () => ({
  'x-rapidapi-host': HOST,
  'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
});

app.get('/', (req, res) => {
  res.send('Sheet Hotels Backend is Online! 🚀');
});

app.get('/api/searchHotels', async (req, res) => {
  try {
    let { city, checkin, checkout, adults, rooms } = req.query;
    
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchHotels`, {
      params: {
        query: city || 'Goa',
        arrival_date: checkin || '2026-10-01',
        departure_date: checkout || '2026-10-05',
        adults: adults || '2',
        room_qty: rooms || '1',
        currency_code: 'INR'
      },
      headers: getHeaders()
    });

    res.json(response.data);
  } catch (error) {
    console.error("API Error Details:", error.response?.data || error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
