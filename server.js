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

// Strictly Fetching 3-Star and Budget Hotels Across India (Filtering out luxury/5-star)
app.get('/api/hotels', async (req, res) => {
  try {
    const city = req.query.city || "Mumbai";
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY missing in environment variables." });
    }

    const queryTypes = [
      `3 star hotels in ${city}`,
      `comfort business hotels in ${city}`,
      `family hotels in ${city}`
    ];

    let allResults = [];
    for (let q of queryTypes) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
        const response = await axios.get(googleUrl, {
          params: { query: q, type: 'lodging', key: GOOGLE_API_KEY }
        });
        if (response.data?.results) {
          allResults = allResults.concat(response.data.results);
        }
      } catch (e) {
        console.error("Sub-query failed:", e.message);
      }
    }

    const uniqueMap = new Map();
    allResults.forEach(item => {
      const nameLower = (item.name || "").toLowerCase();
      const isLuxury = nameLower.includes('taj') || nameLower.includes('oberoi') || nameLower.includes('marriott') || nameLower.includes('hyatt') || nameLower.includes('radisson') || nameLower.includes('luxury') || nameLower.includes('palace') || nameLower.includes('grand') || nameLower.includes('leela') || nameLower.includes('ITC');
      
      if (item.place_id && !isLuxury) {
        uniqueMap.set(item.place_id, item);
      }
    });

    const results = Array.from(uniqueMap.values());
    if (results.length === 0) return res.json({ hotels: [], city });

    const hotels = results.slice(0, 30).map((place, index) => {
      const name = place.name;
      const location = place.formatted_address || place.vicinity || city;
      const rating = place.rating ? `⭐ ${place.rating} (${place.user_ratings_total || 0} reviews)` : "⭐ 3-Star Verified";
      
      let photos = [];
      if (place.photos && place.photos.length > 0) {
        photos = place.photos.slice(0, 10).map(p => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
        );
      }

      const diversePool = [
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80"
      ];

      let counter = 0;
      while (photos.length < 8) {
        photos.push(diversePool[(index + counter) % diversePool.length]);
        counter++;
      }

      return {
        id: index,
        name,
        location,
        rating,
        photos,
        roomsData: [
          { type: "Standard Room (AC + Queen Bed)" },
          { type: "Executive Deluxe Room (City View)" },
          { type: "Family Triple Room (Extra Bed)" }
        ],
        mealsData: [
          { type: "Room Only (No Meals)" },
          { type: "Room + Breakfast (CP Plan)" },
          { type: "Breakfast & Dinner (MAP Plan - Recommended)" },
          { type: "All Meals Included (AP Plan)" }
        ]
      };
    });

    res.json({ hotels, city });

  } catch (err) {
    console.error("API Error:", err.message);
    res.status(500).json({ error: "API Failed", details: err.message });
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
      <title>Sheet Hotels | Pan-India 3-Star Stays</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f1f5f9; margin: 0; padding: 0; color: #1e293b; }
        
        .header { background: #0f172a; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; color: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .logo { font-size: 20px; font-weight: 900; color: #38bdf8; }
        .tagline { font-size: 11px; color: #94a3b8; }

        .promo-ticker { background: #dc2626; color: #fff; text-align: center; padding: 8px; font-size: 12px; font-weight: 800; }

        .hero-banner { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 25px 15px; color: #fff; }
        .search-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 20px; box-shadow: 0 15px 30px rgba(0,0,0,0.2); color: #333; }
        
        .search-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 14px; }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; position: relative; }
        .full-width { grid-column: span 2; }
        
        .input-box { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; background: #f8fafc; }
        .input-box label { font-size: 10px; font-weight: 800; color: #64748b; display: block; text-transform: uppercase; margin-bottom: 2px; }
        .input-box input, .input-box select { border: none; background: transparent; font-size: 15px; width: 100%; outline: none; font-weight: 700; color: #0f172a; }

        .quick-cities { display: flex; gap: 6px; overflow-x: auto; padding: 10px 0 5px 0; white-space: nowrap; }
        .quick-city-pill { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #334155; cursor: pointer; flex-shrink: 0; }
        .quick-city-pill:hover { background: #2563eb; color: #fff; border-color: #2563eb; }

        .suggestions-box { position: absolute; top: 75px; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; z-index: 100; max-height: 180px; overflow-y: auto; display: none; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .suggestion-item { padding: 10px 14px; font-size: 14px; font-weight: 600; color: #334155; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
        .suggestion-item:hover { background: #eff6ff; color: #2563eb; }

        .search-btn { background: #2563eb; color: white; border: none; width: 100%; padding: 15px; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer; margin-top: 14px; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }

        .container { max-width: 600px; margin: 20px auto; padding: 0 12px; }
        .results-header { margin-bottom: 15px; font-size: 18px; font-weight: 800; color: #0f172a; }
        
        .hotel-card { background: #ffffff; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; position: relative; }
        
        .slider-container { position: relative; width: 100%; height: 240px; background: #0f172a; border-top-left-radius: 16px; border-top-right-radius: 16px; overflow: hidden; }
        .slider-track { display: flex; width: 100%; height: 100%; transition: transform 0.4s ease-in-out; }
        .slider-img { min-width: 100%; height: 100%; object-fit: cover; }
        
        .slider-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; z-index: 10; }
        .prev-btn { left: 10px; }
        .next-btn { right: 10px; }
        
        .rating-badge { position: absolute; top: 12px; right: 12px; background: #10b981; color: #fff; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; z-index: 5; }
        .star-tag { position: absolute; top: 12px; left: 12px; background: #0284c7; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; z-index: 5; }
        .image-counter { position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.7); color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; z-index: 5; }

        .hotel-info { padding: 18px; }
        .hotel-name { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .hotel-location { font-size: 13px; color: #64748b; margin-bottom: 10px; font-weight: 500; }
        
        .badges-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .badge { background: #f0fdf4; color: #16a34a; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; border: 1px solid #bbf7d0; }

        .selector-box { background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 10px; position: relative; z-index: 10; }
        .selector-box label { font-size: 10px; font-weight: 800; color: #475569; display: block; margin-bottom: 4px; text-transform: uppercase; }
        .selector-box select { width: 100%; padding: 8px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-weight: 700; font-size: 13px; background: #fff; color: #0f172a; outline: none; cursor: pointer; }

        .action-row { display: flex; gap: 8px; margin-top: 10px; }
        .wa-btn { background: #25D366; color: white; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: 12px; text-decoration: none; font-weight: 800; flex: 2; font-size: 14px; box-shadow: 0 4px 12px rgba(37,211,102,0.3); }
        .callback-btn { background: #0f172a; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 800; flex: 1; font-size: 13px; cursor: pointer; }
        
        .loader { text-align: center; padding: 40px; color: #64748b; font-weight: 600; font-size: 16px; }
      </style>
    </head>
    <body>

      <div class="header">
        <div class="logo">Sheet Hotels</div>
        <div class="tagline">✨ Verified Pan-India 3-Star Stays</div>
      </div>

      <div class="promo-ticker">🎉 Use Code SHEET15 on WhatsApp to unlock special 3-Star booking discounts!</div>

      <div class="hero-banner">
        <div class="search-container">
          <div class="search-title">🔍 Find 3-Star Hotels Across India</div>
          <div class="input-grid">
            <div class="input-box full-width" style="position: relative;">
              <label>Enter Any City in India</label>
              <input type="text" id="cityInput" value="Mumbai" placeholder="e.g. Goa, Varanasi, Delhi..." autocomplete="off" onkeyup="showSuggestions(this.value)">
              <div id="suggestionsBox" class="suggestions-box"></div>
            </div>

            <div class="input-box full-width" style="border:none; background:transparent; padding:0;">
              <div class="quick-cities">
                <span class="quick-city-pill" onclick="quickSearch('Mumbai')">Mumbai</span>
                <span class="quick-city-pill" onclick="quickSearch('Goa')">Goa</span>
                <span class="quick-city-pill" onclick="quickSearch('Delhi')">Delhi</span>
                <span class="quick-city-pill" onclick="quickSearch('Varanasi')">Varanasi</span>
                <span class="quick-city-pill" onclick="quickSearch('Jaipur')">Jaipur</span>
                <span class="quick-city-pill" onclick="quickSearch('Bangalore')">Bangalore</span>
                <span class="quick-city-pill" onclick="quickSearch('Manali')">Manali</span>
                <span class="quick-city-pill" onclick="quickSearch('Udaipur')">Udaipur</span>
              </div>
            </div>

            <div class="input-box">
              <label>Check-In</label>
              <input type="date" id="checkinInput" value="${defaultDates.checkin}">
            </div>
            <div class="input-box">
              <label>Check-Out</label>
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
          <button class="search-btn" onclick="searchHotels()">Search 3-Star Stays</button>
        </div>
      </div>

      <div class="container">
        <div class="results-header" id="resultsHeader">Pan-India 3-Star Hotels</div>
        <div id="results">
          <div class="loader">Loading properties across India...</div>
        </div>
      </div>

      <script>
        let cachedHotels = [];
        const popularCities = ["Mumbai", "Goa", "Delhi", "Bangalore", "Jaipur", "Udaipur", "Manali", "Shimla", "Kolkata", "Varanasi", "Agra", "Pune", "Hyderabad", "Chennai"];

        window.onload = function() { searchHotels(); };

        function quickSearch(city) {
          document.getElementById('cityInput').value = city;
          searchHotels();
        }

        function showSuggestions(val) {
          const box = document.getElementById('suggestionsBox');
          if (!val) { box.style.display = 'none'; return; }
          
          const filtered = popularCities.filter(c => c.toLowerCase().includes(val.toLowerCase()));
          if (filtered.length === 0) { box.style.display = 'none'; return; }

          let html = "";
          filtered.forEach(city => {
            html += \`<div class="suggestion-item" onclick="selectCity('\${city}')">📍 Sheet Hotels - \${city}</div>\`;
          });
          box.innerHTML = html;
          box.style.display = 'block';
        }

        function selectCity(city) {
          document.getElementById('cityInput').value = city;
          document.getElementById('suggestionsBox').style.display = 'none';
          searchHotels();
        }

        async function searchHotels() {
          document.getElementById('suggestionsBox').style.display = 'none';
          const city = document.getElementById('cityInput').value.trim() || "Mumbai";
          const resultsDiv = document.getElementById('results');
          const resultsHeader = document.getElementById('resultsHeader');

          resultsHeader.innerText = "Hotels in " + city;
          resultsDiv.innerHTML = "<div class='loader'>Fetching 3-star verified stays...</div>";

          try {
            const queryUrl = \`/api/hotels?city=\${encodeURIComponent(city)}\`;
            const res = await fetch(queryUrl);
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:#ef4444; text-align:center;'>Error: " + data.error + "</p>";
              return;
            }

            cachedHotels = data.hotels || [];
            if (cachedHotels.length === 0) {
              resultsDiv.innerHTML = "<p style='color:#64748b; text-align:center;'>No 3-star hotels found for this location.</p>";
              return;
            }

            resultsHeader.innerText = \`Top 3-Star Stays in \${city} (\${cachedHotels.length} Properties)\`;
            renderHotels();

          } catch (err) {
            resultsDiv.innerHTML = "<p style='color:#ef4444; text-align:center;'>Search Error occurred.</p>";
          }
        }

        let currentIndices = {};

        function renderHotels() {
          const resultsDiv = document.getElementById('results');
          let html = "";

          cachedHotels.forEach((hotel, idx) => {
            if (currentIndices[idx] === undefined) currentIndices[idx] = 0;
            
            let roomOptionsHtml = "";
            hotel.roomsData.forEach(room => {
              roomOptionsHtml += \`<option value="\${room.type}">\${room.type}</option>\`;
            });

            let mealOptionsHtml = "";
            hotel.mealsData.forEach(meal => {
              mealOptionsHtml += \`<option value="\${meal.type}">\${meal.type}</option>\`;
            });

            let imagesHtml = "";
            hotel.photos.forEach(photo => {
              imagesHtml += \`<img src="\${photo}" class="slider-img" alt="\${hotel.name}" loading="lazy">\`;
            });

            html += \`
              <div class="hotel-card">
                <div class="slider-container" id="slider_\${idx}">
                  <div class="star-tag">⭐ 3-Star Hotel</div>
                  <div class="rating-badge">\${hotel.rating}</div>
                  <div class="slider-track" id="track_\${idx}" style="transform: translateX(0%);">
                    \${imagesHtml}
                  </div>
                  <button class="slider-btn prev-btn" onclick="slideImage(\${idx}, -1)">❮</button>
                  <button class="slider-btn next-btn" onclick="slideImage(\${idx}, 1)">❯</button>
                  <div class="image-counter" id="counter_\${idx}">1 / \${hotel.photos.length}</div>
                </div>
                
                <div class="hotel-info">
                  <div class="hotel-name">\${hotel.name}</div>
                  <div class="hotel-location">📍 \${hotel.location}</div>
                  
                  <div class="badges-row">
                    <span class="badge">🟢 Free Cancellation</span>
                    <span class="badge">🟢 Pay at Hotel</span>
                    <span class="badge">🟢 GST Invoice Available</span>
                  </div>

                  <div class="selector-box">
                    <label>Select Room Category</label>
                    <select id="roomSelect_\${idx}">
                      \${roomOptionsHtml}
                    </select>
                  </div>

                  <div class="selector-box">
                    <label>Select Meal Plan</label>
                    <select id="mealSelect_\${idx}">
                      \${mealOptionsHtml}
                    </select>
                  </div>

                  <div class="action-row">
                    <button class="wa-btn" onclick="bookViaWhatsApp(\${idx})">
                      <span>📱 Book via WhatsApp</span>
                    </button>
                    <button class="callback-btn" onclick="requestCallback(\${idx})">
                      📞 Call Back
                    </button>
                  </div>
                </div>
              </div>
            \`;
          });

          resultsDiv.innerHTML = html;
        }

        function slideImage(hotelIdx, direction) {
          const hotel = cachedHotels[hotelIdx];
          const totalPhotos = hotel.photos.length;
          
          currentIndices[hotelIdx] += direction;
          if (currentIndices[hotelIdx] < 0) {
            currentIndices[hotelIdx] = totalPhotos - 1;
          } else if (currentIndices[hotelIdx] >= totalPhotos) {
            currentIndices[hotelIdx] = 0;
          }

          const track = document.getElementById('track_' + hotelIdx);
          track.style.transform = \`translateX(-\${currentIndices[hotelIdx] * 100}%)\`;
          
          document.getElementById('counter_' + hotelIdx).innerText = (currentIndices[hotelIdx] + 1) + " / " + totalPhotos;
        }

        function bookViaWhatsApp(idx) {
          const hotel = cachedHotels[idx];
          const selectedRoom = document.getElementById('roomSelect_' + idx).value;
          const selectedMeal = document.getElementById('mealSelect_' + idx).value;
          
          const city = document.getElementById('cityInput').value;
          const checkin = document.getElementById('checkinInput').value;
          const checkout = document.getElementById('checkoutInput').value;
          const adults = document.getElementById('adultsInput').value;
          const roomsCount = document.getElementById('roomsInput').value;

          const msg = encodeURIComponent(
            "Hi Sheet Hotels, I want to book this 3-star stay:\\n\\n" + 
            "🏨 Hotel: " + hotel.name + "\\n" +
            "🛏️ Room Type: " + selectedRoom + "\\n" +
            "🍽️ Meal Plan: " + selectedMeal + "\\n" +
            "📍 Location: " + hotel.location + "\\n" +
            "📅 Check-in: " + checkin + "\\n" +
            "📅 Check-out: " + checkout + "\\n" +
            "👥 Guests: " + adults + " Adults, " + roomsCount + " Room(s)"
          );

          window.open("https://wa.me/917388442233?text=" + msg, "_blank");
        }

        function requestCallback(idx) {
          const hotel = cachedHotels[idx];
          const userPhone = prompt("Please enter your mobile number for instant callback:");
          if (!userPhone) return;

          const msg = encodeURIComponent(
            "Hi Sheet Hotels, I need an urgent callback for booking assistance:\\n\\n" +
            "📞 Customer Phone: " + userPhone + "\\n" +
            "🏨 Interested Hotel: " + hotel.name + "\\n" +
            "📍 Location: " + hotel.location
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
