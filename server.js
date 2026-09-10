const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// Helper for dynamic dates (Checkin: +7 days, Checkout: +10 days)
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

app.get('/api/hotels', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: "City is required" });
    if (!RAPIDAPI_KEY) return res.status(500).json({ error: "RAPIDAPI_KEY missing on Render" });

    const { checkin, checkout } = getDates();

    // 1. Fetch Region ID using v2/regions
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

    // 2. Fetch Hotels using v3 Search Endpoint
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
    res.status(500).json({ error: "API Failed", details: errData });
  }
});

// Front-End UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sheet Holidays Search Engine</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; text-align: center; }
        .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        input, button { padding: 12px; margin: 5px; border-radius: 5px; border: 1px solid #ccc; font-size: 16px; }
        input { width: 60%; }
        button { background-color: #007bff; color: white; cursor: pointer; border: none; font-weight: bold; }
        .hotel-card { border: 1px solid #ddd; border-radius: 8px; margin-top: 15px; padding: 15px; text-align: left; display: flex; gap: 15px; align-items: center; }
        .hotel-card img { width: 130px; height: 100px; object-fit: cover; border-radius: 5px; }
        .wa-btn { background-color: #25D366; color: white; padding: 8px 12px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Sheet Holidays Search Engine</h2>
        <div>
          <input type="text" id="cityInput" placeholder="Enter City (e.g. Goa, Mumbai)">
          <button onclick="searchHotels()">Search</button>
        </div>
        <div id="results"></div>
      </div>
      <script>
        async function searchHotels() {
          const city = document.getElementById('cityInput').value.trim();
          const resultsDiv = document.getElementById('results');
          if (!city) return alert("Enter a city name!");

          resultsDiv.innerHTML = "<p>Searching best deals for " + city + "...</p>";

          try {
            const res = await fetch('/api/hotels?city=' + encodeURIComponent(city));
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:red;'><b>Error:</b> " + data.error + "</p>";
              return;
            }

            // Universal Parser for v3 structure
            let properties = data.properties || data.data?.propertySearch?.properties || data.data?.properties || [];

            if (properties.length === 0) {
              resultsDiv.innerHTML = "<p>No hotels found for " + city + "</p>";
              return;
            }

            let html = "";
            properties.slice(0, 10).forEach(hotel => {
              const name = hotel.name || "Luxury Stay";
              const price = hotel.price?.lead?.formatted || hotel.price?.options?.[0]?.strikeThrough?.formatted || "Check Rate";
              const img = hotel.propertyImage?.image?.url || "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg";
              const waLink = "https://wa.me/919999999999?text=" + encodeURIComponent("Hi Sheet Holidays, I want to book " + name + " in " + city + " for " + price);

              html += \`
                <div class="hotel-card">
                  <img src="\${img}" alt="Hotel">
                  <div>
                    <h3 style="margin:0 0 5px 0;">\${name}</h3>
                    <p style="margin:0; color:#d32f2f; font-weight:bold;">Price: \${price}</p>
                    <a href="\${waLink}" target="_blank" class="wa-btn">Book on WhatsApp</a>
                  </div>
                </div>\`;
            });
            resultsDiv.innerHTML = html;
          } catch (err) {
            resultsDiv.innerHTML = "<p style='color:red;'>Search failed.</p>";
          }
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
