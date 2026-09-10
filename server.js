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

app.get('/api/hotels', async (req, res) => {
  try {
    const city = req.query.city || "Mumbai";
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY missing in environment variables." });
    }

    const searchQuery = `luxury hotels resorts in ${city}`;
    const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    
    const response = await axios.get(googleUrl, {
      params: { query: searchQuery, type: 'lodging', key: GOOGLE_API_KEY }
    });

    const results = response.data?.results || [];
    if (results.length === 0) return res.json({ hotels: [], city });

    const hotels = results.slice(0, 20).map((place, index) => {
      const name = place.name;
      const location = place.formatted_address || place.vicinity || city;
      const rating = place.rating ? `⭐ ${place.rating} (${place.user_ratings_total || 0} reviews)` : "⭐ Verified Property";
      
      let img = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
      if (place.photos && place.photos.length > 0) {
        const photoRef = place.photos[0].photo_reference;
        img = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;
      }

      // Generate realistic dynamic base rates per night based on index/name tier
      const baseMultiplier = (index % 3 === 0) ? 6500 : (index % 2 === 0 ? 4500 : 3500);
      const deluxePrice = baseMultiplier;
      const superDeluxePrice = Math.round(baseMultiplier * 1.35);
      const suitePrice = Math.round(baseMultiplier * 1.9);

      return {
        id: index,
        name,
        location,
        rating,
        img,
        roomsData: [
          { type: "Deluxe Room (1 King Bed)", price: deluxePrice },
          { type: "Super Deluxe (City View + Breakfast)", price: superDeluxePrice },
          { type: "Luxury Suite (Balcony + All Meals)", price: suitePrice }
        ]
      };
    });

    res.json({ hotels, city });

  } catch (err) {
    console.error("Google Places API Error:", err.message);
    res.status(500).json({ error: "Google Places API Failed", details: err.message });
  }
});

app.get('*', (req, res) => {
  const defaultDates = getDefaultDates();

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sheet Holidays | Direct Booking Portal</title>
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
        .hotel-name { font-size: 18px; font-weight: bold; margin: 0 0 10px 0; }
        
        .room-select-box { background: #f1f5f9; padding: 10px; border-radius: 8px; margin-bottom: 10px; }
        .room-select-box label { font-size: 11px; font-weight: bold; color: #475569; display: block; margin-bottom: 4px; }
        .room-select-box select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 600; font-size: 13px; background: #fff; }
        
        .price-display { font-size: 20px; font-weight: 800; color: #dc2626; margin: 8px 0; }
        .wa-btn { background: #25D366; color: white; display: flex; align-items: center; justify-content: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; width: 100%; font-size: 15px; }
        .loader { text-align: center; padding: 30px; color: #94a3b8; }
      </style>
    </head>
    <body>

      <div class="promo-banner">🔥 Special Discount: Save up to 20% by booking directly with Sheet Holidays!</div>

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
          <button class="search-btn" onclick="searchHotels()">Search Available Hotels</button>
        </div>

        <div class="results-header" id="resultsHeader">Hotels List</div>
        <div id="results">
          <div class="loader">Loading verified properties...</div>
        </div>
      </div>

      <script>
        let cachedHotels = [];

        window.onload = function() { searchHotels(); };

        async function searchHotels() {
          const city = document.getElementById('cityInput').value.trim();
          const resultsDiv = document.getElementById('results');
          const resultsHeader = document.getElementById('resultsHeader');

          if (!city) return alert("कृपया शहर का नाम दर्ज करें!");

          resultsHeader.innerText = "Hotels in " + city;
          resultsDiv.innerHTML = "<div class='loader'>होटल और रूम विकल्प लोड हो रहे हैं...</div>";

          try {
            const queryUrl = \`/api/hotels?city=\${encodeURIComponent(city)}\`;
            const res = await fetch(queryUrl);
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:#f87171; text-align:center;'>Error: " + data.error + "</p>";
              return;
            }

            cachedHotels = data.hotels || [];
            if (cachedHotels.length === 0) {
              resultsDiv.innerHTML = "<p style='color:white; text-align:center;'>कोई होटल नहीं मिला।</p>";
              return;
            }

            resultsHeader.innerText = "Top " + cachedHotels.length + " Hotels in " + city;
            renderHotels();

          } catch (err) {
            resultsDiv.innerHTML = "<p style='color:#f87171; text-align:center;'>Search Error. Backend logs check karein.</p>";
          }
        }

        function renderHotels() {
          const resultsDiv = document.getElementById('results');
          const checkin = document.getElementById('checkinInput').value;
          const checkout = document.getElementById('checkoutInput').value;
          const adults = document.getElementById('adultsInput').value;
          const roomsCount = document.getElementById('roomsInput').value;
          
          let html = "";

          cachedHotels.forEach((hotel, idx) => {
            let roomOptionsHtml = "";
            hotel.roomsData.forEach((room, rIdx) => {
              const selectedAttr = rIdx === 0 ? "selected" : "";
              roomOptionsHtml += \`<option value="\${room.type}" data-price="\${room.price}">\${room.type} - ₹\${room.price.toLocaleString('en-IN')} / night</option>\`;
            });

            html += \`
              <div class="hotel-card">
                <div class="hotel-img-container">
                  <img src="\${hotel.img}" class="hotel-img" alt="\${hotel.name}" loading="lazy">
                  <div class="location-badge">📍 \${hotel.location.substring(0, 30)}...</div>
                  <div class="rating-badge">\${hotel.rating}</div>
                </div>
                <div class="hotel-info">
                  <div class="hotel-name">\${hotel.name}</div>
                  
                  <div class="room-select-box">
                    <label>Select Room Type</label>
                    <select id="roomSelect_\${idx}" onchange="updatePrice(\${idx})">
                      \${roomOptionsHtml}
                    </select>
                  </div>

                  <div style="font-size: 11px; color: #64748b;">Estimated Best Rate (Per Night)</div>
                  <div class="price-tag" id="priceDisplay_\${idx}">₹\${hotel.roomsData[0].price.toLocaleString('en-IN')}</div>
                  
                  <button class="wa-btn" onclick="bookViaWhatsApp(\${idx})">📱 Book Now via WhatsApp</button>
                </div>
              </div>
            \`;
          });

          resultsDiv.innerHTML = html;
        }

        function updatePrice(idx) {
          const selectElement = document.getElementById('roomSelect_' + idx);
          const selectedOption = selectElement.options[selectElement.selectedIndex];
          const price = selectedOption.getAttribute('data-price');
          document.getElementById('priceDisplay_' + idx).innerText = "₹" + Number(price).toLocaleString('en-IN');
        }

        function bookViaWhatsApp(idx) {
          const hotel = cachedHotels[idx];
          const selectElement = document.getElementById('roomSelect_' + idx);
          const selectedRoom = selectElement.value;
          const price = selectElement.options[selectElement.selectedIndex].getAttribute('data-price');
          
          const city = document.getElementById('cityInput').value;
          const checkin = document.getElementById('checkinInput').value;
          const checkout = document.getElementById('checkoutInput').value;
          const adults = document.getElementById('adultsInput').value;
          const roomsCount = document.getElementById('roomsInput').value;

          const msg = encodeURIComponent(
            "Hi Sheet Holidays, I want to book this hotel:\\n\\n" + 
            "🏨 Hotel: " + hotel.name + "\\n" +
            "🛏️ Room Type: " + selectedRoom + "\\n" +
            "💰 Rate: ₹" + Number(price).toLocaleString('en-IN') + " per night\\n" +
            "📍 Location: " + hotel.location + "\\n" +
            "📅 Check-in: " + checkin + "\\n" +
            "📅 Check-out: " + checkout + "\\n" +
            "👥 Guests: " + adults + " Adults, " + roomsCount + " Room(s)"
          );

          window.open("https://wa.me/917388442233?text=" + msg, "_blank");
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
