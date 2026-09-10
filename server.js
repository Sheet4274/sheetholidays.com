const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// Helper for default dates (Tomorrow to 3 days later)
function getDefaultDates() {
  const today = new Date();
  const checkin = new Date(today);
  checkin.setDate(today.getDate() + 1);
  const checkout = new Date(today);
  checkout.setDate(today.getDate() + 3);

  return {
    checkin: checkin.toISOString().split('T')[0],
    checkout: checkout.toISOString().split('T')[0]
  };
}

// 1. Search API Endpoint
app.get('/api/hotels', async (req, res) => {
  try {
    let { city, checkin, checkout, adults, rooms } = req.query;
    if (!city) city = "Goa";
    
    const defaultDates = getDefaultDates();
    checkin = checkin || defaultDates.checkin;
    checkout = checkout || defaultDates.checkout;
    adults = adults || '2';
    rooms = rooms || '1';

    if (!RAPIDAPI_KEY) return res.status(500).json({ error: "RAPIDAPI_KEY missing on server" });

    // Step A: Region Lookup
    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: { query: city, locale: 'en_IN', domain: 'IN' },
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });

    const regions = regionRes.data?.data || [];
    if (!regions.length) return res.status(404).json({ error: "City region not found" });

    const cityRegion = regions.find(r => r.type === 'CITY' || r.type === 'NEIGHBORHOOD') || regions[0];
    const gaiaId = cityRegion.gaiaId || cityRegion.id;

    // Step B: Hotels Search v3
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

    res.json(hotelRes.data);

  } catch (err) {
    const errData = err.response ? err.response.data : err.message;
    console.error("API Error:", JSON.stringify(errData));
    res.status(500).json({ error: "API Search Failed", details: errData });
  }
});

// 2. Multi-City Auto Featured Endpoint (Returns 20 Mix Hotels)
app.get('/api/featured-hotels', async (req, res) => {
  try {
    const defaultDates = getDefaultDates();
    const cities = ["Goa", "Mumbai", "Delhi", "Jaipur"];
    let allHotels = [];

    for (const city of cities) {
      if (allHotels.length >= 20) break;
      try {
        const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
          params: { query: city, locale: 'en_IN', domain: 'IN' },
          headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
        });
        const gaiaId = regionRes.data?.data?.[0]?.gaiaId || regionRes.data?.data?.[0]?.id;
        
        if (gaiaId) {
          const hotelRes = await axios.get(`https://${RAPIDAPI_HOST}/v3/hotels/search`, {
            params: {
              region_id: gaiaId,
              locale: 'en_IN',
              domain: 'IN',
              checkin_date: defaultDates.checkin,
              checkout_date: defaultDates.checkout,
              sort_order: 'RECOMMENDED',
              adults_number: '2',
              currency: 'INR',
              page_number: '1'
            },
            headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
          });

          const props = hotelRes.data?.properties || hotelRes.data?.data?.propertySearch?.properties || [];
          const taggedProps = props.map(p => ({ ...p, cityName: city }));
          allHotels = allHotels.concat(taggedProps);
        }
      } catch (e) { console.log(`Skipped ${city}`); }
    }

    res.json({ properties: allHotels.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch featured hotels" });
  }
});

// 3. UI Application
app.get('*', (req, res) => {
  const dates = getDefaultDates();
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <title>Sheet Holidays - Book Best Hotels & Resorts Online</title>
      <meta name="description" content="Book Luxury Hotels, Resorts, and Budget Stays at Best Rates with Sheet Holidays. Get instant discounts on WhatsApp booking.">
      <meta name="keywords" content="Hotels booking, Sheet Holidays, Goa Hotels, Mumbai Resorts, Holiday Packages">
      <meta property="og:title" content="Sheet Holidays - Instant Hotel Booking">
      <meta property="og:description" content="Exclusive deals on hotels across India. Book via WhatsApp easily.">
      
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 0; color: #f8fafc; }

        .navbar { background: #1e293b; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
        .logo { font-size: 20px; font-weight: 800; color: #38bdf8; text-decoration: none; }

        .container { max-width: 600px; margin: 15px auto; padding: 0 12px; }

        .promo-banner { background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; padding: 12px 15px; border-radius: 12px; margin-bottom: 15px; font-weight: bold; text-align: center; font-size: 14px; }
        .promo-code { background: #000; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; }

        .search-card { background: #1e293b; border-radius: 16px; padding: 16px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .input-group { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; }
        .input-group label { font-size: 10px; font-weight: 800; color: #94a3b8; display: block; text-transform: uppercase; }
        .input-group input, .input-group select { border: none; background: transparent; font-size: 14px; width: 100%; outline: none; font-weight: 600; color: #fff; }

        .form-row { display: flex; gap: 8px; }
        .form-row .input-group { flex: 1; }

        .search-btn { background: #2563eb; color: white; border: none; width: 100%; padding: 14px; border-radius: 25px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .search-btn:hover { background: #1d4ed8; }

        .section-title { font-size: 18px; font-weight: 700; margin: 25px 0 12px 0; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; }
        .hotel-card { background: #1e293b; border-radius: 14px; overflow: hidden; margin-bottom: 16px; border: 1px solid #334155; }
        .hotel-img { width: 100%; height: 210px; object-fit: cover; background: #334155; display: block; }
        .hotel-body { padding: 14px; }
        .hotel-name { font-size: 17px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; }
        .location-badge { font-size: 12px; color: #94a3b8; margin-bottom: 8px; }
        .hotel-price { font-size: 20px; font-weight: 800; color: #34d399; margin: 6px 0; }

        .wa-btn { background: #22c55e; color: white; display: block; text-align: center; padding: 11px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px; font-size: 15px; }
      </style>
    </head>
    <body>

      <div class="navbar">
        <a href="/" class="logo">🏨 Sheet Holidays</a>
      </div>

      <div class="container">
        <div class="promo-banner">
          🔥 SPECIAL OFFER: Get Flat 15% OFF! Use Code: <span class="promo-code">SHEET10</span>
        </div>

        <div class="search-card">
          <div class="input-group">
            <label>Where To?</label>
            <input type="text" id="cityInput" value="Goa" placeholder="Enter City (e.g. Goa, Mumbai)">
          </div>

          <div class="form-row">
            <div class="input-group">
              <label>Check-In</label>
              <input type="date" id="checkinInput" value="${dates.checkin}">
            </div>
            <div class="input-group">
              <label>Check-Out</label>
              <input type="date" id="checkoutInput" value="${dates.checkout}">
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label>Guests</label>
              <select id="adultsInput">
                <option value="1">1 Adult</option>
                <option value="2" selected>2 Adults</option>
                <option value="3">3 Adults</option>
                <option value="4">4 Adults</option>
              </select>
            </div>
            <div class="input-group">
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

        <div class="section-title">
          <span id="listTitle">Top Featured Stays (20 Mix Destinations)</span>
        </div>
        
        <div id="results">
          <p style="text-align:center; color:#94a3b8;">Loading 20 Featured Hotels...</p>
        </div>
      </div>

      <script>
        // Exact Price Parser for v3 Response Variants
        function parsePrice(hotel) {
          try {
            if (hotel.price?.lead?.formatted) return hotel.price.lead.formatted;
            if (hotel.price?.options?.[0]?.formattedDisplayPrice) return hotel.price.options[0].formattedDisplayPrice;
            if (hotel.price?.options?.[0]?.strikeThrough?.formatted) return hotel.price.options[0].strikeThrough.formatted;
            if (hotel.price?.options?.[0]?.price?.formatted) return hotel.price.options[0].price.formatted;
            if (hotel.price?.lead?.amount) return "₹" + Math.round(hotel.price.lead.amount).toLocaleString('en-IN');
            if (hotel.price?.raw?.value) return "₹" + Math.round(hotel.price.raw.value).toLocaleString('en-IN');
          } catch (e) {}
          return "Contact for Rates";
        }

        // Exact Real Image URL Parser
        function parseImage(hotel) {
          let url = "";
          try {
            url = hotel.propertyImage?.image?.url || 
                  hotel.propertyImage?.image?.fallbackUrl || 
                  hotel.propertyImage?.url || 
                  hotel.mapMarker?.propertyImage?.url || "";
                  
            if (url) {
              if (url.startsWith('//')) url = 'https:' + url;
              return url;
            }
          } catch(e) {}
          return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop";
        }

        // Render Cards HTML
        function buildHotelCards(properties, defaultCity = "") {
          let html = "";
          properties.forEach(hotel => {
            const name = hotel.name || "Luxury Hotel & Resort";
            const price = parsePrice(hotel);
            const img = parseImage(hotel);
            const city = hotel.cityName || defaultCity || "India";

            const checkin = document.getElementById('checkinInput').value;
            const checkout = document.getElementById('checkoutInput').value;
            const guests = document.getElementById('adultsInput').value;
            const rooms = document.getElementById('roomsInput').value;

            const msg = encodeURIComponent("Hi Sheet Holidays! I want to book " + name + " in " + city + ". Dates: " + checkin + " to " + checkout + " (" + guests + " Guests, " + rooms + " Room). Price: " + price);
            const waLink = "https://wa.me/917388442233?text=" + msg;

            html += \`
              <div class="hotel-card">
                <img src="\${img}" class="hotel-img" alt="\${name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop';">
                <div class="hotel-body">
                  <div class="hotel-name">\${name}</div>
                  <div class="location-badge">📍 \${city}</div>
                  <div class="hotel-price">\${price}</div>
                  <a href="\${waLink}" target="_blank" class="wa-btn">Book on WhatsApp</a>
                </div>
              </div>
            \`;
          });
          return html;
        }

        async function loadFeaturedHotels() {
          const resultsDiv = document.getElementById('results');
          try {
            const res = await fetch('/api/featured-hotels');
            const data = await res.json();
            const properties = data.properties || [];

            if (properties.length > 0) {
              resultsDiv.innerHTML = buildHotelCards(properties);
            } else {
              searchHotels();
            }
          } catch(e) {
            searchHotels();
          }
        }

        async function searchHotels() {
          const city = document.getElementById('cityInput').value.trim();
          const checkin = document.getElementById('checkinInput').value;
          const checkout = document.getElementById('checkoutInput').value;
          const adults = document.getElementById('adultsInput').value;
          const rooms = document.getElementById('roomsInput').value;
          
          const resultsDiv = document.getElementById('results');
          const listTitle = document.getElementById('listTitle');

          if (!city) return alert("City Name Enter Karein!");

          listTitle.innerText = "Available Hotels in " + city;
          resultsDiv.innerHTML = "<p style='text-align:center; color:#94a3b8;'>Searching best live rates for " + city + "...</p>";

          try {
            const url = \`/api/hotels?city=\${encodeURIComponent(city)}&checkin=\${checkin}&checkout=\${checkout}&adults=\${adults}&rooms=\${rooms}\`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:#f43f5e; text-align:center;'>Error: " + data.error + "</p>";
              return;
            }

            let properties = data.properties || data.data?.propertySearch?.properties || data.data?.properties || [];

            if (!properties || properties.length === 0) {
              resultsDiv.innerHTML = "<p style='text-align:center;'>No hotels found in " + city + ". Try another location.</p>";
              return;
            }

            resultsDiv.innerHTML = buildHotelCards(properties.slice(0, 20), city);

          } catch (err) {
            resultsDiv.innerHTML = "<p style='color:#f43f5e; text-align:center;'>Search Request Failed. Check connection.</p>";
          }
        }

        window.onload = loadFeaturedHotels;
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
