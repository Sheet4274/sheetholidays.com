const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Static folder agar kuch CSS/Images rakhni ho
app.use(express.static(path.join(__dirname, 'public')));

// 1. Home Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 2. Hotels Page
app.get('/hotels', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'hotels.html'));
});

// 3. Packages Page
app.get('/packages', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'packages.html'));
});

// 4. Cabs Page
app.get('/cabs', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cabs.html'));
});

// 5. Contact Page
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

// Hotel API Route
app.get('/api/hotels', async (req, res) => {
  try {
    const city = req.query.city || "Mumbai";
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY missing on server." });
    }
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json`, {
      params: { query: `3 star hotels in ${city}`, type: 'lodging', key: GOOGLE_API_KEY }
    });
    
    const results = response.data?.results || [];
    const hotels = results.slice(0, 20).map((place, index) => ({
      id: index,
      name: place.name,
      location: place.formatted_address || place.vicinity || city,
      rating: place.rating ? `⭐ ${place.rating}` : "⭐ 3-Star Verified",
      photos: place.photos ? place.photos.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${GOOGLE_API_KEY}`) : ["https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800"]
    }));
    res.json({ hotels, city });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
