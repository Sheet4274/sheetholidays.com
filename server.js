require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Naya aur asaan RapidAPI Host (Jo free-text search leta hai bina ID ke)
const HOST = 'booking-com15.p.rapidapi.com'; 
const headers = {
  'x-rapidapi-host': HOST,
  'x-rapidapi-key': process.env.RAPIDAPI_KEY
};

// Ek hi single endpoint jo direct city name se hotels nikal dega
app.get('/api/searchHotels', async (req, res) => {
  try {
    let { city, checkin, checkout, adults, rooms } = req.query;
    
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchHotels`, {
      params: {
        query: city || ,
        arrival_date: checkin || '2026-10-01',
        departure_date: checkout || '2026-10-05',
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
