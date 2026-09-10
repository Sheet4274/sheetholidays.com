const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// Dynamic Future Dates
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

    // 1. Fetch Region ID
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

    // 2. Fetch Hotels v3
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

// Front-End UI - Direct inside server.js
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sheet Holidays - Hotels</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #0a192f; margin: 0; padding: 0; color: #333; }
        
        .header { background: #0b1e38; padding: 15px; text-align: center; border-bottom: 1px solid #1e293b; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
        
        .container { max-width: 500px; margin: 20px auto; padding: 0 15px; }
        
        .search-card { background: #ffffff; border-radius: 16px; padding: 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .input-box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; margin-bottom: 10px; background: #f8fafc; text-align: left; }
        .input-box label { font-size: 11px; font-weight: bold; color: #64748b; display: block; }
        .input-box input { border: none; background: transparent; font-size: 15px; width: 100%; outline: none; font-weight: 600; color: #0f172a; }
        
        .search-btn { background: #1d4ed8; color: white; border: none; width: 100%; padding: 14px; border-radius: 25px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 5px; }
        .search-btn:hover { background: #1e40af; }

        .results { margin-top: 20px; }
        .hotel-card { background: #ffffff; border-radius: 14px; overflow: hidden; margin-bottom: 16px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .hotel-img { width: 100%; height: 180px; object-fit: cover; background: #e2e8f0; }
        .hotel-info { padding: 14px; }
        .hotel-name { font-size: 17px; font-weight: bold; color: #0f172a; margin: 0 0 6px 0; }
        .price-tag { font-size: 18px; font-weight: 800; color: #dc2626; margin: 6px 0; }
        
        .wa-btn { background: #25D366; color: white; display: block; text-align: center; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px; font-size: 15px; }
      </style>
    </head>
    <body>

      <div class="header">
        <h1>Sheet Holidays</h1>
      </div>

      <div class="container">
        <div class="search-card">
          <div class="input-box">
            <label>WHERE TO?</label>
            <input type="text" id="cityInput" value="Goa" placeholder="Enter City Name">
          </div>

          <div class="input-box">
            <label>DATES</label>
            <input type="text" value="Flexible Dates (7-10 Days Out)" readonly>
          </div>

          <div class="input-box">
            <label>TRAVELLERS</label>
            <input type="text" value="2 Travellers, 1 Room" readonly>
          </div>

          <button class="search-btn" onclick="searchHotels()">Search Hotels</button>
        </div>

        <div id="results" class="results"></div>
      </div>

      <script>
        async function searchHotels() {
          const city = document.getElementById('cityInput').value.trim();
          const resultsDiv = document.getElementById('results');
          if (!city) return alert("City ka naam daalo!");

          resultsDiv.innerHTML = "<p style='color:white; text-align:center;'>Hotels load ho rahe hain...</p>";

          try {
            const res = await fetch('/api/hotels?city=' + encodeURIComponent(city));
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:#f87171; text-align:center;'>Error: " + data.error + "</p>";
              return;
            }

            let properties = data.properties || data.data?.propertySearch?.properties || data.data?.properties || [];

            if (!properties || properties.length === 0) {
              resultsDiv.innerHTML = "<p style='color:white; text-align:center;'>Koi hotel nahi mila " + city + " ke liye.</p>";
              return;
            }

            let html = "";
            properties.slice(0, 10).forEach(hotel => {
              const name = hotel.name || "Luxury Hotel";
              
              // Extract real image from nested objects
              let img = "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg";
              if (hotel.propertyImage?.image?.url) {
                img = hotel.propertyImage.image.url;
              } else if (hotel.propertyImage?.image?.fallbackUrl) {
                img = hotel.propertyImage.image.fallbackUrl;
              }

              // Extract real price formatted string
              let price = "Check Rate";
              if (hotel.price?.lead?.formatted) {
                price = hotel.price.lead.formatted;
              } else if (hotel.price?.options?.[0]?.formattedDisplayPrice) {
                price = hotel.price.options[0].formattedDisplayPrice;
              } else if (hotel.price?.options?.[0]?.strikeThrough?.formatted) {
                price = hotel.price.options[0].strikeThrough.formatted;
              }

              // WhatsApp Redirect to 7388442233
              const msg = encodeURIComponent("Hi Sheet Holidays, mujhe " + name + " (" + city + ") book karna hai. Dynamic Price: " + price);
              const waLink = "https://wa.me/917388442233?text=" + msg;

              html += \`
                <div class="hotel-card">
                  <img src="\${img}" class="hotel-img" alt="Hotel" onerror="this.src='https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg'">
                  <div class="hotel-info">
                    <div class="hotel-name">\${name}</div>
                    <div class="price-tag">\${price}</div>
                    <a href="\${waLink}" target="_blank" class="wa-btn">WhatsApp Booking</a>
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
