const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

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

// Fixed Image & Exact Price Extractor
function processHotelData(hotel) {
  const name = hotel.name || "Luxury Hotel";

  // 1. Image Fixer: Hotels.com CDN URLs resolution fix
  let rawImg = hotel.propertyImage?.image?.url || 
               hotel.propertyImage?.image?.fallbackUrl || 
               hotel.primaryImageUrl || 
               hotel.cardPhotos?.[0]?.url || "";

  if (rawImg) {
    // Standardize URL protocol & dimensions
    if (rawImg.startsWith('//')) rawImg = 'https:' + rawImg;
    rawImg = rawImg.replace('{size}', 'z'); // Replace placeholder size if any
    if (rawImg.includes('?')) rawImg = rawImg.split('?')[0]; // Remove queries blocking render
  } else {
    rawImg = "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg"; // High quality fallback
  }

  // 2. Exact Real Price Extraction (No Random Rates)
  let rawPrice = hotel.price?.lead?.formatted || 
                 hotel.price?.options?.[0]?.formattedDisplayPrice || 
                 hotel.price?.strikeThrough?.formatted || 
                 hotel.price?.options?.[0]?.strikeThrough?.formatted || 
                 "";

  if (!rawPrice && hotel.price?.lead?.amount) {
    rawPrice = "₹" + Math.round(hotel.price.lead.amount);
  }

  if (!rawPrice) {
    rawPrice = "Rate on Request";
  }

  const location = hotel.neighborhood?.name || hotel.destinationInfo?.distanceFromDestination?.get || "Prime Location";

  return { name, img: rawImg, price: rawPrice, location };
}

app.get('/api/hotels', async (req, res) => {
  try {
    const city = req.query.city || "Mumbai";
    const checkin = req.query.checkin || getDefaultDates().checkin;
    const checkout = req.query.checkout || getDefaultDates().checkout;
    const adults = req.query.adults || "2";
    const rooms = req.query.rooms || "1";

    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ error: "RAPIDAPI_KEY missing on server environment." });
    }

    // Fetch Region ID
    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: { query: city, locale: 'en_IN', domain: 'IN' },
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });

    const regions = regionRes.data?.data || [];
    if (!regions.length) return res.status(404).json({ error: "City region not found" });

    const cityRegion = regions.find(r => r.type === 'CITY' || r.type === 'NEIGHBORHOOD') || regions[0];
    const gaiaId = cityRegion.gaiaId || cityRegion.id;

    // Fetch Hotels
    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/v3/hotels/search`, {
      params: {
        region_id: gaiaId,
        locale: 'en_IN',
        domain: 'IN',
        checkin_date: checkin,
        checkout_date: checkout,
        sort_order: 'RECOMMENDED',
        adults_number: adults,
        rooms_number: rooms,
        currency: 'INR',
        page_number: '1'
      },
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });

    let rawProperties = hotelRes.data?.properties || 
                        hotelRes.data?.data?.propertySearch?.properties || 
                        hotelRes.data?.data?.properties || [];

    const cleanedHotels = rawProperties.slice(0, 20).map(hotel => processHotelData(hotel));

    res.json({ hotels: cleanedHotels, city });

  } catch (err) {
    const errData = err.response ? err.response.data : err.message;
    console.error("API Error:", JSON.stringify(errData));
    res.status(500).json({ error: "API Search Failed", details: errData });
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
      <title>Sheet Holidays | Best Hotels & Resorts</title>
      <meta name="description" content="Book top luxury hotels & resorts with instant WhatsApp confirmation.">

      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0a192f; margin: 0; padding: 0; color: #f8fafc; }
        
        .promo-banner { background: #dc2626; color: #fff; text-align: center; padding: 8px; font-size: 13px; font-weight: bold; }
        .header { background: #0b1e38; padding: 16px; text-align: center; border-bottom: 1px solid #1e293b; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; }

        .container { max-width: 550px; margin: 15px auto; padding: 0 12px; }

        .search-card { background: #ffffff; border-radius: 16px; padding: 18px; color: #333; }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .full-width { grid-column: span 2; }
        
        .input-box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 12px; background: #f8fafc; }
        .input-box label { font-size: 10px; font-weight: bold; color: #64748b; display: block; text-transform: uppercase; }
        .input-box input, .input-box select { border: none; background: transparent; font-size: 14px; width: 100%; outline: none; font-weight: 600; color: #0f172a; }
        
        .search-btn { background: #1d4ed8; color: white; border: none; width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 12px; }

        .results-header { margin: 20px 0 10px; font-size: 18px; font-weight: bold; color: #38bdf8; }
        .hotel-card { background: #ffffff; border-radius: 14px; overflow: hidden; margin-bottom: 18px; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .hotel-img-container { position: relative; width: 100%; height: 210px; background: #1e293b; }
        .hotel-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .location-badge { position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.85); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }

        .hotel-info { padding: 16px; }
        .hotel-name { font-size: 18px; font-weight: bold; margin: 0 0 6px 0; }
        .price-tag { font-size: 22px; font-weight: 800; color: #dc2626; margin-top: 4px; }
        
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

        <div class="results-header" id="resultsHeader">Top Hotels</div>
        <div id="results">
          <div class="loader">Loading Top Properties...</div>
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

          if (!city) return alert("Please enter city!");

          resultsHeader.innerText = "Hotels in " + city;
          resultsDiv.innerHTML = "<div class='loader'>Fetching real hotel photos & rates...</div>";

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
                "Hi Sheet Holidays, I want to book: " + hotel.name + 
                "\\nCity: " + city + 
                "\\nCheck-in: " + checkin + 
                "\\nCheck-out: " + checkout + 
                "\\nGuests: " + adults + " Adults, " + rooms + " Room(s)" +
                "\\nQuoted Rate: " + hotel.price
              );
              const waLink = "https://wa.me/917388442233?text=" + msg;

              html += \`
                <div class="hotel-card">
                  <div class="hotel-img-container">
                    <img src="\${hotel.img}" class="hotel-img" alt="\${hotel.name}" onerror="this.src='https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg'">
                    <div class="location-badge">📍 \${hotel.location}</div>
                  </div>
                  <div class="hotel-info">
                    <div class="hotel-name">\${hotel.name}</div>
                    <div style="font-size: 11px; color: #64748b;">Starting price per night</div>
                    <div class="price-tag">\${hotel.price}</div>
                    <a href="\${waLink}" target="_blank" class="wa-btn">📱 Book via WhatsApp</a>
                  </div>
                </div>
              \`;
            });

            resultsDiv.innerHTML = html;

          } catch (err) {
            resultsDiv.innerHTML = "<p style='color:#f87171; text-align:center;'>Search failed. Backend response check karein.</p>";
          }
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
