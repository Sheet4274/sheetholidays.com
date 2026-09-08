const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// 1. CORS पूरी तरह खोल दिया है ताकि Google Sites / GitHub कहीं से भी ब्लॉक न हो
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const HOST = 'agoda-com.p.rapidapi.com';
const API_KEY = process.env.RAPIDAPI_KEY;

app.get('/', (req, res) => {
  res.send('SheetHolidays Backend Live! 🚀');
});

// City Name to ID resolver
async function resolveLocation(city) {
  if (!city) return null;
  const value = String(city).trim();
  if (/^\d+$/.test(value) || /^\d+_\d+$/.test(value)) return value;

  const cityMap = {
    goa: '4153', mumbai: '15560', delhi: '14706',
    bangalore: '16538', hyderabad: '8803', chennai: '17270',
    manila: '17192', dubai: '18731', srinagar: '318'
  };

  const cityKey = value.toLowerCase();
  if (cityMap[cityKey]) return cityMap[cityKey];

  try {
    const response = await axios.get(`https://${HOST}/hotels/auto-complete`, {
      params: { text: value, language: 'en-us' },
      headers: { 'x-rapidapi-host': HOST, 'x-rapidapi-key': API_KEY },
      timeout: 10000
    });
    const locations = response.data?.data || response.data?.results || [];
    if (locations.length > 0) {
      return locations[0].id || locations[0].cityId || null;
    }
  } catch (error) {
    console.error('Location error:', error.message);
  }
  return null;
}

// API Endpoint
app.get('/api/searchHotels', async (req, res) => {
  try {
    const city = req.query.city || 'Srinagar';
    const checkin = req.query.checkin || '2026-10-01';
    const checkout = req.query.checkout || '2026-10-05';
    const adults = req.query.adults || '2';
    const rooms = req.query.rooms || '1';

    if (!API_KEY) {
      return res.status(500).json({ success: false, error: 'RAPIDAPI_KEY missing in Render' });
    }

    const destinationId = await resolveLocation(city);
    if (!destinationId) {
      return res.status(404).json({ success: false, error: `City not found: ${city}` });
    }

    const response = await axios.get(`https://${HOST}/hotels/search-overnight`, {
      params: {
        id: destinationId,
        checkinDate: checkin,
        checkoutDate: checkout,
        adults: adults,
        rooms: rooms,
        currency: 'INR'
      },
      headers: {
        'x-rapidapi-host': HOST,
        'x-rapidapi-key': API_KEY
      },
      timeout: 25000
    });

    return res.json({ success: true, destinationId, data: response.data });

  } catch (error) {
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
