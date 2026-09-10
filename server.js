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

    // Step 1: Get Region ID for the City
    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: {
        query: city,
        locale: 'en_US',
        domain: 'US'
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    const regions = regionRes.data && regionRes.data.data ? regionRes.data.data : [];
    // Filter to find the first valid CITY type region
    const cityRegion = regions.find(r => r.type === 'CITY' || r.type === 'NEIGHBORHOOD') || regions[0];

    if (!cityRegion || !cityRegion.gaiaId) {
      return res.status(404).json({ error: "City region not found" });
    }

    const regionId = cityRegion.gaiaId;

    // Step 2: Search Hotels using Gaia Region ID
    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/hotels/search`, {
      params: {
        region_id: regionId,
        locale: 'en_US',
        domain: 'US',
        checkin_date: checkin || '2026-10-01',
        checkout_date: checkout || '2026-10-05',
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
    console.error("Hotels.com API Error:", errorDetails);
    res.status(500).json({ 
      error: "API Request Failed", 
      details: errorDetails 
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
