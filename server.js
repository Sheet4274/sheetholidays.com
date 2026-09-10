const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// 1. Hotel Search Endpoint
app.get('/api/hotels', async (req, res) => {
  try {
    const { city, checkin, checkout } = req.query;
    if (!city) return res.status(400).json({ error: "City name is required" });

    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ error: "Render par RAPIDAPI_KEY missing hai!" });
    }

    // Step A: Region ID Fetching
    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: { query: city, locale: 'en_IN', domain: 'IN' },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    const regions = regionRes.data?.data || [];
    const cityRegion = regions.find(r => r.type === 'CITY' || r.type === 'NEIGHBORHOOD') || regions[0];

    if (!cityRegion || (!cityRegion.gaiaId && !cityRegion.id)) {
      return res.status(404).json({ error: `${city} ke liye region ID nahi mila.` });
    }

    const gaiaId = cityRegion.gaiaId || cityRegion.id;

    // Step B: Hotels List Fetching
    const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/hotels/search`, {
      params: {
        region_id: gaiaId,
        locale: 'en_IN',
        domain: 'IN',
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
    const errData = err.response ? err.response.data : err.message;
    console.error("API Fetch Error:", JSON.stringify(errData));
    res.status(500).json({ error: "API Failure", details: errData });
  }
});

// 2. Full UI Serving
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sheet Holidays Search Engine</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; text-align: center; }
        .container { max-width: 850px; margin: auto; background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .search-box { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
        input { padding: 12px 15px; border-radius: 6px; border: 1px solid #ccc; font-size: 16px; width: 65%; }
        button { background-color: #007bff; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
        button:hover { background-color: #0056b3; }
        .hotel-card { border: 1px solid #e1e4e8; border-radius: 10px; margin-top: 15px; padding: 15px; text-align: left; display: flex; gap: 20px; align-items: center; background: #fff; }
        .hotel-card img { width: 140px; height: 110px; object-fit: cover; border-radius: 8px; }
        .hotel-info { flex-grow: 1; }
        .price { color: #d32f2f; font-size: 18px; font-weight: bold; margin: 5px 0; }
        .wa-btn { background-color: #25D366; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 style="color:#333; margin-top:0;">Sheet Holidays Travel Engine</h2>
        <div class="search-box">
          <input type="text" id="cityInput" placeholder="Enter City (e.g. Goa, Delhi, Mumbai)">
          <button onclick="searchHotels()">Search</button>
        </div>
        <div id="results"></div>
      </div>

      <script>
        async function searchHotels() {
          const city = document.getElementById('cityInput').value.trim();
          const resultsDiv = document.getElementById('results');
          if (!city) return alert("City ka naam daalo pehle!");

          resultsDiv.innerHTML = "<p style='color:#666;'>Searching best hotels for <b>" + city + "</b>...</p>";

          try {
            const res = await fetch('/api/hotels?city=' + encodeURIComponent(city));
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:red;'><b>Error:</b> " + data.error + "</p>";
              return;
            }

            // Universal Safe Extraction logic across all Hotels.com API schema versions
            let properties = [];
            if (data.data?.propertySearch?.properties) {
              properties = data.data.propertySearch.properties;
            } else if (data.properties) {
              properties = data.properties;
            } else if (data.data?.properties) {
              properties = data.data.properties;
            }

            if (!properties || properties.length === 0) {
              resultsDiv.innerHTML = "<p style='color:#e65100;'>No hotels found for <b>" + city + "</b>. Try another city.</p>";
              return;
            }

            let html = "";
            properties.slice(0, 10).forEach(hotel => {
              const name = hotel.name || "Luxury Stay";
              const price = hotel.price?.lead?.formatted || hotel.price?.options?.[0]?.strikeThrough?.formatted || "Check Rate";
              const img = hotel.propertyImage?.image?.url || "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg";
              
              const waText = encodeURIComponent("Hi Sheet Holidays, I want to book " + name + " in " + city + " for " + price);
              const waLink = "https://wa.me/919999999999?text=" + waText;

              html += \`
                <div class="hotel-card">
                  <img src="\${img}" alt="Hotel Photo">
                  <div class="hotel-info">
                    <h3 style="margin:0 0 5px 0; color:#2c3e50;">\${name}</h3>
                    <div class="price">Price: \${price}</div>
                    <a href="\${waLink}" target="_blank" class="wa-btn">Book via WhatsApp</a>
                  </div>
                </div>
              \`;
            });

            resultsDiv.innerHTML = html;

          } catch (err) {
            resultsDiv.innerHTML = "<p style='color:red;'>Failed to fetch data from backend server.</p>";
          }
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
