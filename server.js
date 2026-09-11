const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.use(express.static(path.join(__dirname, 'public')));

// 1. Home Page Directly Render
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sheet Holidays | Home</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; font-family: 'Lato', sans-serif; margin: 0; padding: 0; }
    body { background: #f1f5f9; color: #1e293b; }
    header { background: #0f172a; padding: 15px 5%; display: flex; justify-content: space-between; align-items: center; color: #fff; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
    header a.logo { font-size: 1.4rem; font-weight: 900; color: #38bdf8; text-decoration: none; display: flex; align-items: center; gap: 8px; }
    nav { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
    nav a { color: #cbd5e1; text-decoration: none; font-weight: 700; font-size: 0.9rem; }
    nav a:hover, nav a.active { color: #38bdf8; }
    .hero { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 60px 20px; text-align: center; color: #fff; }
    .hero h1 { font-size: 2.5rem; font-weight: 900; margin-bottom: 10px; color: #38bdf8; }
    .hero p { font-size: 1.1rem; color: #94a3b8; margin-bottom: 30px; }
    .grid-cards { max-width: 900px; margin: -30px auto 40px; padding: 0 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; position: relative; z-index: 10; }
    .card { background: #fff; padding: 25px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e2e8f0; }
    .card i { font-size: 2.5rem; color: #2563eb; margin-bottom: 15px; }
    .card h3 { font-size: 1.2rem; font-weight: 900; margin-bottom: 8px; color: #0f172a; }
    .card p { font-size: 0.9rem; color: #64748b; margin-bottom: 15px; line-height: 1.5; }
    .card a.btn { display: inline-block; background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 0.9rem; }
    .card a.btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <header>
    <a href="/" class="logo"><i class="fas fa-globe-asia"></i> Sheet Holidays</a>
    <nav>
      <a href="/" class="active">Home</a>
      <a href="/hotels">Hotels</a>
      <a href="/packages">Holiday Packages</a>
      <a href="/cabs">Taxi Services</a>
      <a href="/contact">Contact Us</a>
    </nav>
  </header>
  <div class="hero">
    <h1>Welcome to Sheet Holidays</h1>
    <p>Your Trusted Partner for Pan-India 3-Star Hotels, Tour Packages & Taxi Rentals</p>
  </div>
  <div class="grid-cards">
    <div class="card"><i class="fas fa-hotel"></i><h3>Hotels & Stays</h3><p>Verified 3-star accommodations across all major Indian cities.</p><a href="/hotels" class="btn">Explore Hotels</a></div>
    <div class="card"><i class="fas fa-suitcase-rolling"></i><h3>Holiday Packages</h3><p>Custom handpicked itineraries including Kashmir, Kerala, Goa, and more.</p><a href="/packages" class="btn">View Packages</a></div>
    <div class="card"><i class="fas fa-taxi"></i><h3>Taxi Services</h3><p>Reliable outstation cabs, one-way drops, and local rentals.</p><a href="/cabs" class="btn">Book Cabs</a></div>
  </div>
</body>
</html>`);
});

// 2. Other Pages
app.get('/hotels', (req, res) => { res.sendFile(path.join(__dirname, 'hotels.html')); });
app.get('/packages', (req, res) => { res.sendFile(path.join(__dirname, 'holidaypackages.html')); });
app.get('/cabs', (req, res) => { res.sendFile(path.join(__dirname, 'cabs.html')); });
app.get('/contact', (req, res) => { res.sendFile(path.join(__dirname, 'Contactus.html')); });

// Hotel API Route
app.get('/api/hotels', async (req, res) => {
  try {
    const city = req.query.city || "Mumbai";
    if (!GOOGLE_API_KEY) { return res.status(500).json({ error: "GOOGLE_API_KEY missing on server." }); }
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
