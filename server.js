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

// 1. WORLDWIDE TRENDING HOTELS (Multi-Country & Cities)
app.get('/api/trendingHotels', async (req, res) => {
  try {
    const locations = [
      { city: 'Dubai', id: '-2030119' },
      { city: 'Goa', id: '-2092174' },
      { city: 'Srinagar', id: '-2111580' },
      { city: 'Singapore', id: '-2108775' },
      { city: 'Bangkok', id: '-2247137' },
      { city: 'London', id: '-261179' }
    ];

    let allHotels = [];

    for (let loc of locations) {
      try {
        const response = await axios.get(`https://${HOST}/api/v1/hotels/searchHotels`, {
          params: {
            dest_id: loc.id,
            search_type: 'CITY',
            arrival_date: '2026-10-01',
            departure_date: '2026-10-05',
            adults: '2',
            room_qty: '1',
            currency_code: 'INR'
          },
          headers
        });
        
        const hotels = response.data.data?.hotels || response.data.result || [];
        hotels.slice(0, 3).forEach(h => {
          allHotels.push({
            location: loc.city,
            name: h.property?.name || h.hotel_name || 'Luxury Property',
            photo: h.property?.photoUrls?.[0] || h.main_photo_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
            price: h.property?.priceBreakdown?.grossPrice?.value ? `₹${h.property.priceBreakdown.grossPrice.value}` : '₹5,500',
            rating: h.property?.reviewScore ? `${h.property.reviewScore} ⭐` : '4.6 ⭐'
          });
        });
      } catch (err) {
        console.log(`Skipped ${loc.city}`);
      }
    }

    res.json({ status: true, data: allHotels });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

// 2. UNIVERSAL DESTINATION SEARCH (Finds any city worldwide)
app.get('/api/destinations', async (req, res) => {
  try {
    const query = req.query.query || 'Dubai';
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchDestination`, {
      params: { query, locale: 'en-us' },
      headers
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

// 3. SEARCH HOTELS BY DEST_ID (Worldwide)
app.get('/api/searchHotels', async (req, res) => {
  try {
    const { dest_id, search_type, arrival_date, departure_date, adults, rooms } = req.query;
    
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id: dest_id || '-2030119', // Default Dubai
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
