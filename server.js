const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

app.get('/api/hotels', async (req, res) => {
  try {
    const { city, checkin, checkout } = req.query;

    if (!city) {
      return res.status(400).json({ error: "City name is required" });
    }

    // Default dates if missing
    const today = new Date();
    const defaultCheckin = checkin || new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0];
    const defaultCheckout = checkout || new Date(today.setDate(today.getDate() + 3)).toISOString().split('T')[0];

    // Step 1: Fetch Gaia Region ID for City
    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: {
        query: city,
        locale: 'en_IN',
        domain: 'IN'
      },
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

    const regionId = cityRegion.gaiaId;

    // Step 2: Fetch Hotels via Region ID
    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/hotels/search`, {
      params: {
        region_id: regionId,
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
    
    res.status(500).json({ 
      error: "Server Connection Error!", 
      details: errorDetails 
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
