const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// RapidAPI Credentials
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// 1. Static Files Middleware (sabse pehle assets ke liye)
app.use(express.static(path.join(__dirname, 'public')));

// 2. API Route (YE PEHLE HONA CHAHIYE)
app.get('/api/hotels', async (req, res) => {
  try {
    const { city, checkin, checkout } = req.query;

    if (!city) {
      return res.status(400).json({ error: "City name is required" });
    }

    const defaultCheckin = checkin || "2026-10-01";
    const defaultCheckout = checkout || "2026-10-05";

    // Step A: Region Search
    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: { query: city, locale: 'en_IN', domain: 'IN' },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    const regions = regionRes.data && regionRes.data.data ? regionRes.data.data : [];
    const cityRegion = regions.find(r => r.type === 'CITY' || r.type === 'NEIGHBORHOOD') || regions[0];

    if (!cityRegion || !cityRegion.gaiaId) {
      return res.status(404).json({ error: "City region not found" });
    }

    // Step B: Hotels Search
    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/hotels/search`, {
      params: {
        region_id: cityRegion.gaiaId,
        locale: 'en_IN',
        domain: 'IN',
        checkin_date: defaultCheckin,
        checkout_date: defaultCheckout,
        sort_order: 'RECOMMENDED',
        adults_number: '2',
        currency: 'INR',
        page_number: '1'
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    res.json(hotelRes.data);

  } catch (err) {
    const errorDetails = err.response ? err.response.data : err.message;
    console.error("Hotels.com RapidAPI Error:", JSON.stringify(errorDetails));
    res.status(500).json({ error: "API Request Failed", details: errorDetails });
  }
});

// 3. UI Routes (SABSE AAKHIRI MEIN)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
