const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// Helper to calculate future dates automatically
function getDates() {
  const today = new Date();
  const inDate = new Date(today);
  inDate.setDate(today.getDate() + 7);
  const outDate = new Date(today);
  outDate.setDate(today.getDate() + 10);

  return {
    checkin: inDate.toISOString().split('T')[0],
    checkout: outDate.toISOString().split('T')[0]
  };
}

// 1. API Search Endpoint
app.get('/api/hotels', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: "City name is required" });
    if (!RAPIDAPI_KEY) return res.status(500).json({ error: "RAPIDAPI_KEY missing on Render" });

    const { checkin, checkout } = getDates();

    // Step A: Region ID Resolution
    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: { query: city, locale: 'en_IN', domain: 'IN' },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    const regions = regionRes.data?.data || [];
    if (!regions.length) return res.status(404).json({ error: "City region not found" });

    const cityRegion = regions.find(r => r.type === 'CITY' || r.type === 'NEIGHBORHOOD') || regions[0];
    const gaiaId = cityRegion.gaiaId || cityRegion.id;

    // Step B: Search Hotels v3
    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/v3/hotels/search`, {
      params: {
        region_id: gaiaId,
        locale: 'en_IN',
        domain: 'IN',
        checkin_date: checkin,
        checkout_date: checkout,
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
    const errData = err.response ? err.response.data : err.message;
    console.error("API Error:", JSON.stringify(errData));
    res.status(500).json({ error: "API Search Failed", details: errData });
  }
});

// 2. Full Customized UI Engine matching Hotels.com Layout
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sheet Holidays - Hotel Booking</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #eef2f5; margin: 0; padding: 0; }
        
        /* Header Bar */
        .navbar { background-color: #0a192f; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; color: white; }
        .logo { font-size: 20px; font-weight: bold; color: #ff4d4f; text-decoration: none; display: flex; align-items: center; gap: 8px; }
        
        /* Main Container */
        .main-container { max-width: 600px; margin: 20px auto; padding: 0 15px; }
        .search-card { background: #ffffff; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        
        .input-group { border: 1.5px solid #d0d7de; border-radius: 12px; padding: 12px 15px; margin-bottom: 12px; text-align: left; background: #fafbfc; }
        .input-label { font-size: 12px; font-weight: 700; color: #1a1a1a; display: block; margin-bottom: 2px; }
        .input-field { border: none; background: transparent; font-size: 16px; width: 100%; outline: none; font-weight: 500; color: #2d3748; }

        .search-btn { background-color: #0a192f; color: white; width: 100%; padding: 16px; border: none; border-radius: 30px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 10px; transition: 0.2s; }
        .search-btn:hover { background-color: #1a2a4a; }

        /* Results List */
        .results-container { margin-top: 25px; }
        .hotel-card { background: white; border-radius: 16px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); text-align: left; display: flex; flex-direction: column; }
        .hotel-img { width: 100%; height: 200px; object-fit: cover; }
        .hotel-body { padding: 16px; }
        .hotel-title { font-size: 18px; font-weight: bold; color: #1a202c; margin: 0 0 8px 0; }
        .hotel-price { font-size: 20px; font-weight: 800; color: #0a192f; margin: 8px 0; }
        
        .wa-booking-btn { background-color: #25D366; color: white; text-align: center; text-decoration: none; display: block; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 16px; margin-top: 10px; }
      </style>
    </head>
    <body>

      <!-- Navbar -->
      <div class="navbar">
        <div class="logo">🏨 Sheet Holidays</div>
      </div>

      <div class="main-container">
        <!-- Search Form Card -->
        <div class="search-card">
          <div class="input-group">
            <span class="input-label">📍 Where to?</span>
            <input type="text" id="cityInput" class="input-field" placeholder="Goa, Mumbai, Delhi..." value="Goa">
          </div>

          <div class="input-group">
            <span class="input-label">📅 Dates</span>
            <input type="text" class="input-field" value="Next Week (Flexible Stay)" readonly>
          </div>

          <div class="input-group">
            <span class="input-label">👤 Travellers</span>
            <input type="text" class="input-field" value="2 travellers, 1 room" readonly>
          </div>

          <button class="search-btn" onclick="searchHotels()">Search</button>
        </div>

        <!-- Hotel Search Results -->
        <div id="results" class="results-container"></div>
      </div>

      <script>
        async function searchHotels() {
          const city = document.getElementById('cityInput').value.trim();
          const resultsDiv = document.getElementById('results');
          if (!city) return alert("Please enter a city name!");

          resultsDiv.innerHTML = "<p style='text-align:center; color:#4a5568;'>Searching live hotel deals in <b>" + city + "</b>...</p>";

          try {
            const res = await fetch('/api/hotels?city=' + encodeURIComponent(city));
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:red; text-align:center;'>Error: " + data.error + "</p>";
              return;
            }

            // Deep JSON Parsing for Properties Array
            let properties = data.properties || data.data?.propertySearch?.properties || data.data?.properties || [];

            if (!properties || properties.length === 0) {
              resultsDiv.innerHTML = "<p style='text-align:center;'>No hotels found for " + city + ". Try another city.</p>";
              return;
            }

            let html = "";
            properties.slice(0, 10).forEach(hotel => {
              const name = hotel.name || "Luxury Stay";
              
              // Multi-layer Price Extraction
              let price = "Check Rate";
              if (hotel.price?.lead?.formatted) {
                price = hotel.price.lead.formatted;
              } else if (hotel.price?.options?.[0]?.strikeThrough?.formatted) {
                price = hotel.price.options[0].strikeThrough.formatted;
              } else if (hotel.price?.options?.[0]?.formattedDisplayPrice) {
                price = hotel.price.options[0].formattedDisplayPrice;
              }

              // Multi-layer Image Extraction
              let img = "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg";
              if (hotel.propertyImage?.image?.url) {
                img = hotel.propertyImage.image.url;
              } else if (hotel.propertyImage?.image?.fallbackUrl) {
                img = hotel.propertyImage.image.fallbackUrl;
              }

              // WhatsApp Redirect to 7388442233
              const waText = encodeURIComponent("Hi Sheet Holidays! I want to book " + name + " in " + city + " (" + price + "). Please help me book.");
              const waLink = "https://wa.me/917388442233?text=" + waText;

              html += \`
                <div class="hotel-card">
                  <img src="\${img}" class="hotel-img" alt="Hotel Photo" onerror="this.src='https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg'">
                  <div class="hotel-body">
                    <div class="hotel-title">\${name}</div>
                    <div class="hotel-price">Price: \${price}</div>
                    <a href="\${waLink}" target="_blank" class="wa-booking-btn">Book on WhatsApp</a>
                  </div>
                </div>
              \`;
            });

            resultsDiv.innerHTML = html;

          } catch (err) {
            resultsDiv.innerHTML = "<p style='color:red; text-align:center;'>Failed to fetch search results from server.</p>";
          }
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
