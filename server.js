const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

function getDefaultDates() {
  const today = new Date();
  const checkin = new Date(today);
  checkin.setDate(today.getDate() + 7);
  const checkout = new Date(today);
  checkout.setDate(today.getDate() + 9);

  return {
    checkin: checkin.toISOString().split('T')[0],
    checkout: checkout.toISOString().split('T')[0]
  };
}

// Backend API using Google Places Text Search (Lodging)
app.get('/api/hotels', async (req, res) => {
  try {
    const city = req.query.city || "Mumbai";
    const checkin = req.query.checkin || getDefaultDates().checkin;
    const checkout = req.query.checkout || getDefaultDates().checkout;
    const adults = req.query.adults || "2";
    const rooms = req.query.rooms || "1";

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY missing in environment variables." });
    }

    // Google Places Text Search API call for hotels/lodging
    const searchQuery = `luxury hotels resorts in ${city}`;
    const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    
    const response = await axios.get(googleUrl, {
      params: {
        query: searchQuery,
        type: 'lodging',
        key: GOOGLE_API_KEY
      }
    });

    const results = response.data?.results || [];

    if (results.length === 0) {
      return res.json({ hotels: [], city });
    }

    // Format Google Places Data cleanly
    const hotels = results.slice(0, 20).map((place, index) => {
      const name = place.name;
      const location = place.formatted_address || place.vicinity || city;
      const rating = place.rating ? `⭐ ${place.rating} (${place.user_ratings_total || 0} reviews)` : "⭐ Verified Property";
      
      // Extract Google Place Photo URL if available
      let img = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"; // Fallback real hotel image
      if (place.photos && place.photos.length > 0) {
        const photoRef = place.photos[0].photo_reference;
        img = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;
      }

      // Since Google Places gives ratings & info, we provide a clean custom conversion-focused rate display
      const priceDisplay = "Instant Quote via WhatsApp";

      return {
        name,
        location,
        rating,
        img,
        price: priceDisplay
      };
    });

    res.json({ hotels, city });

  } catch (err) {
    console.error("Google Places API Error:", err.message);
    res.status(500).json({ error: "Google Places API Failed", details: err.message });
  }
});

// Frontend UI Engine
app.get('*', (req, res) => {
  const defaultDates = getDefaultDates();

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sheet Holidays | Best Hotels & Resorts</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0a192f; margin: 0; padding: 0; color: #f8fafc; }
        .promo-banner { background: #dc2626; color: #fff; text-align: center; padding: 8px; font-size: 13px; font-weight: bold; }
        .header { background: #0b1e38; padding: 16px; text-align: center; border-bottom: 1px solid #1e293b; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; }
        .container { max-width: 550px; margin: 15px auto; padding: 0 12px; }
        .search-card { background: #ffffff; border-radius: 16px; padding: 18px; color: #333; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .full-width { grid-column: span 2; }
        .input-box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 12px; background: #f8fafc; }
        .input-box label { font-size: 10px; font-weight: bold; color: #64748b; display: block; text-transform: uppercase; }
        .input-box input, .input-box select { border: none; background: transparent; font-size: 14px; width: 100%; outline: none; font-weight: 600; color: #0f172a; }
        .search-btn { background: #1d4ed8; color: white; border: none; width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 12px; }
        .results-header { margin: 20px 0 10px; font-size: 18px; font-weight: bold; color: #38bdf8; }
        .hotel-card { background: #ffffff; border-radius: 14px; overflow: hidden; margin-bottom: 18px; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .hotel-img-container { position: relative; width: 100%; height: 220px; background: #1e293b; }
        .hotel-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .location-badge { position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.9); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .rating-badge { position: absolute; top: 12px; right: 12px; background: #fbbf24; color: #000; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
        .hotel-info { padding: 16px; }
        .hotel-name { font-size: 18px; font-weight: bold; margin: 0 0 6px 0; }
        .price-tag { font-size: 16px; font-weight: 800; color: #0284c7; margin-top: 4px; }
        .wa-btn { background: #25D366; color: white; display: flex; align-items: center; justify-content: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px; font-size: 15px; }
        .loader { text-align: center; padding: 30px; color: #94a3b8; }
      </style>
    </head>
    <body>

      <div class="promo-banner">🔥 Flat 15% OFF via WhatsApp! Code: SHEET15</div>

      <div class="header">
        <h1>Sheet Holidays</h1>
      </div>

      <div class="container">
        <div class="search-card">
          <div class="input-grid">
            <div class="input-box full-width">
              <label>City Name</label>
              <input type="text" id="cityInput" value="Mumbai" placeholder="Enter City">
            </div>
            <div class="input-box">
              <label>Check-In Date</label>
              <input type="date" id="checkinInput" value="${defaultDates.checkin}">
            </div>
            <div class="input-box">
              <label>Check-Out Date</label>
              <input type="date" id="checkoutInput" value="${defaultDates.checkout}">
            </div>
            <div class="input-box">
              <label>Guests</label>
              <select id="adultsInput">
                <option value="1">1 Adult</option>
                <option value="2" selected>2 Adults</option>
                <option value="3">3 Adults</option>
                <option value="4">4 Adults</option>
              </select>
            </div>
            <div class="input-box">
              <label>Rooms</label>
              <select id="roomsInput">
                <option value="1" selected>1 Room</option>
                <option value="2">2 Rooms</option>
                <option value="3">3 Rooms</option>
              </select>
            </div>
          </div>
          <button class="search-btn" onclick="searchHotels()">Search Hotels</button>
        </div>

        <div class="results-header" id="resultsHeader">Hotels List</div>
        <div id="results">
          <div class="loader">Loading properties...</div>
        </div>
      </div>

      <script>
        window.onload = function() { searchHotels(); };

        async function searchHotels() {
          const city = document.getElementById('cityInput').value.trim();
          const checkin = document.getElementById('checkinInput').value;
          const checkout = document.getElementById('checkoutInput').value;
          const adults = document.getElementById('adultsInput').value;
          const rooms = document.getElementById('roomsInput').value;
          
          const resultsDiv = document.getElementById('results');
          const resultsHeader = document.getElementById('resultsHeader');

          if (!city) return alert("City name enter karein!");

          resultsHeader.innerText = "Hotels in " + city;
          resultsDiv.innerHTML = "<div class='loader'>Fetching Google Maps verified hotels...</div>";

          try {
            const queryUrl = \`/api/hotels?city=\${encodeURIComponent(city)}&checkin=\${checkin}&checkout=\${checkout}&adults=\${adults}&rooms=\${rooms}\`;
            const res = await fetch(queryUrl);
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:#f87171; text-align:center;'>Error: " + data.error + "</p>";
              return;
            }

            const hotels = data.hotels || [];
            if (hotels.length === 0) {
              resultsDiv.innerHTML = "<p style='color:white; text-align:center;'>No hotels found.</p>";
              return;
            }

            resultsHeader.innerText = "Top " + hotels.length + " Hotels in " + city;
            let html = "";

            hotels.forEach(hotel => {
              const msg = encodeURIComponent(
                "Hi Sheet Holidays, I want to check best price & book: " + hotel.name + 
                "\\nLocation: " + hotel.location +
                "\\nCity: " + city + 
                "\\nCheck-in: " + checkin + 
                "\\nCheck-out: " + checkout + 
                "\\nGuests: " + adults + " Adults, " + rooms + " Room(s)"
              );
              const waLink = "https://wa.me/917388442233?text=" + msg;

              html += \`
                <div class="hotel-card">
                  <div class="hotel-img-container">
                    <img src="\${hotel.img}" class="hotel-img" alt="\${hotel.name}" loading="lazy">
                    <div class="location-badge">📍 \${hotel.location.substring(0, 35)}...</div>
                    <div class="rating-badge">\${hotel.rating}</div>
                  </div>
                  <div class="hotel-info">
                    <div class="hotel-name">\${hotel.name}</div>
                    <div class="price-tag">💰 \${hotel.price}</div>
                    <a href="\${waLink}" target="_blank" class="wa-btn">📱 Get Best Quote on WhatsApp</a>
                  </div>
                </div>
              \`;
            });

            resultsDiv.innerHTML = html;

          } catch (err) {
            resultsDiv.innerHtml = "<p style='color:#f87171; text-align:center;'>Search Error. Backend logs dekhein.</p>";
          }
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
