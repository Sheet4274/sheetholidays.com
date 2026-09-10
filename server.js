const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// Serve static from both public and root
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// API Endpoint
app.get('/api/hotels', async (req, res) => {
  try {
    const { city, checkin, checkout } = req.query;
    if (!city) return res.status(400).json({ error: "City is required" });

    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: { query: city, locale: 'en_IN', domain: 'IN' },
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });

    const regions = regionRes.data?.data || [];
    const cityRegion = regions.find(r => r.type === 'CITY' || r.type === 'NEIGHBORHOOD') || regions[0];

    if (!cityRegion?.gaiaId) return res.status(404).json({ error: "City not found" });

    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/hotels/search`, {
      params: {
        region_id: cityRegion.gaiaId,
        locale: 'en_IN',
        domain: 'IN',
        checkin_date: checkin || '2026-10-01',
        checkout_date: checkout || '2026-10-05',
        sort_order: 'RECOMMENDED',
        adults_number: '2',
        currency: 'INR',
        page_number: '1'
      },
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });

    res.json(hotelRes.data);
  } catch (err) {
    res.status(500).json({ error: "API Failed", details: err.message });
  }
});

// Fail-safe HTML Sender (Checks root AND public)
app.get('*', (req, res) => {
  const publicPath = path.join(__dirname, 'public', 'index.html');
  const rootPath = path.join(__dirname, 'index.html');

  if (fs.existsSync(publicPath)) {
    res.sendFile(publicPath);
  } else if (fs.existsSync(rootPath)) {
    res.sendFile(rootPath);
  } else {
    res.status(404).send("<h1 style='color:red;text-align:center;'>index.html file missing in repository!</h1>");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
