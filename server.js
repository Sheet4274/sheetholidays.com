const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// Helper function to get default dates (Today + 7 days, 2 nights stay)
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

// API Endpoint
app.get('/api/hotels', async (req, res) => {
  try {
    const city = req.query.city || "Goa";
    const checkin = req.query.checkin || getDefaultDates().checkin;
    const checkout = req.query.checkout || getDefaultDates().checkout;
    const adults = req.query.adults || "2";
    const rooms = req.query.rooms || "1";

    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ error: "RAPIDAPI_KEY missing in environment variables" });
    }

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

    // 2. Fetch Hotels Search Results
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

// Front-End UI & SEO Optimized Engine
app.get('*', (req, res) => {
  const defaultDates = getDefaultDates();

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <!-- SEO Meta Tags -->
      <title>Sheet Holidays | Best Hotel Deals, Discounts & Booking</title>
      <meta name="description" content="Book best luxury hotels, resorts, and homestays at lowest guaranteed rates. Exclusive discount codes and instant WhatsApp booking via Sheet Holidays.">
      <meta name="keywords" content="hotels booking, sheet holidays, cheap hotels, luxury resorts, hotel discounts, travel deals">
      <meta name="robots" content="index, follow">
      
      <!-- Open Graph / Social Media SEO -->
      <meta property="og:title" content="Sheet Holidays | Best Hotel Deals & Instant Booking">
      <meta property="og:description" content="Find top luxury hotels at discounted rates with instant WhatsApp confirmation.">
      <meta property="og:type" content="website">

      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0a192f; margin: 0; padding: 0; color: #f8fafc; }
        
        /* Banner Header */
        .promo-banner { background: linear-gradient(90deg, #dc2626, #b91c1c); color: #fff; text-align: center; padding: 8px 12px; font-size: 13px; font-weight: bold; }
        .header { background: #0b1e38; padding: 16px; text-align: center; border-bottom: 1px solid #1e293b; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { color: #94a3b8; font-size: 12px; margin: 4px 0 0 0; }

        .container { max-width: 600px; margin: 15px auto; padding: 0 12px; }
        
        /* Offers Card */
        .offer-card { background: #1e293b; border: 1px dashed #38bdf8; border-radius: 12px; padding: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
        .offer-code { background: #0284c7; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px; }

        /* Search Card */
        .search-card { background: #ffffff; border-radius: 16px; padding: 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); color: #333; }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .full-width { grid-column: span 2; }
        
        .input-box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 12px; background: #f8fafc; }
        .input-box label { font-size: 10px; font-weight: bold; color: #64748b; display: block; text-transform: uppercase; }
        .input-box input, .input-box select { border: none; background: transparent; font-size: 14px; width: 100%; outline: none; font-weight: 600; color: #0f172a; margin-top: 2px; }
        
        .search-btn { background: #1d4ed8; color: white; border: none; width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 12px; transition: 0.2s ease; }
        .search-btn:hover { background: #1e40af; }

        /* Hotel Results List */
        .results-header { margin: 20px 0 10px; font-size: 16px; font-weight: bold; text-align: left; color: #38bdf8; }
        .hotel-card { background: #ffffff; border-radius: 14px; overflow: hidden; margin-bottom: 16px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .hotel-img-container { position: relative; width: 100%; height: 200px; background: #334155; }
        .hotel-img { width: 100%; height: 100%; object-fit: cover; }
        .location-badge { position: absolute; top: 10px; left: 10px; background: rgba(15, 23, 42, 0.85); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }

        .hotel-info { padding: 14px; color: #0f172a; }
        .hotel-name { font-size: 17px; font-weight: bold; margin: 0 0 6px 0; line-height: 1.3; }
        .price-container { display: flex; align-items: baseline; justify-content: space-between; margin-top: 8px; }
        .price-label { font-size: 11px; color: #64748b; }
        .price-tag { font-size: 20px; font-weight: 800; color: #dc2626; }
        
        .wa-btn { background: #25D366; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px; font-size: 15px; }
        .wa-btn:hover { background: #1da851; }
        
        .loader { text-align: center; padding: 30px; font-size: 16px; color: #94a3b8; }
      </style>
    </head>
    <body>

      <!-- Top Offer Banner -->
      <div class="promo-banner">
        🎉 SPECIAL OFFER: Flat 15% OFF on Direct WhatsApp Bookings! Use Code: <span>SHEET15</span>
      </div>

      <div class="header">
        <h1>Sheet Holidays</h1>
        <p>Verified Luxury Hotels & Instant WhatsApp Confirmation</p>
      </div>

      <div class="container">
        
        <!-- Promo Coupon Display -->
        <div class="offer-card">
          <div>
            <div style="font-weight:bold; font-size: 13px;">Flat ₹1,000 Off Coupon</div>
            <div style="font-size: 11px; color: #94a3b8;">Valid on bookings above ₹5,000</div>
          </div>
          <div class="offer-code">SHEET1000</div>
        </div>

        <!-- Search Control Panel -->
        <div class="search-card">
          <div class="input-grid">
            <div class="input-box full-width">
              <label>Destination City</label>
              <input type="text" id="cityInput" value="Goa" placeholder="Enter City (e.g. Goa, Manali, Mumbai)">
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
              <label>Guests (Adults)</label>
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

        <!-- Dynamic Results Section -->
        <div class="results-header" id="resultsHeader">Available Properties</div>
        <div id="results">
          <div class="loader">Loading Top 20 Verified Hotels...</div>
        </div>
      </div>

      <script>
        // Auto Load 20 Hotels on Page Load
        window.onload = function() {
          searchHotels();
        };

        async function searchHotels() {
          const city = document.getElementById('cityInput').value.trim();
          const checkin = document.getElementById('checkinInput').value;
          const checkout = document.getElementById('checkoutInput').value;
          const adults = document.getElementById('adultsInput').value;
          const rooms = document.getElementById('roomsInput').value;
          
          const resultsDiv = document.getElementById('results');
          const resultsHeader = document.getElementById('resultsHeader');

          if (!city) return alert("Please enter a city name!");

          resultsHeader.innerText = "Searching hotels in " + city + "...";
          resultsDiv.innerHTML = "<div class='loader'>Fetching real-time rates and images...</div>";

          try {
            const queryUrl = \`/api/hotels?city=\${encodeURIComponent(city)}&checkin=\${checkin}&checkout=\${checkout}&adults=\${adults}&rooms=\${rooms}\`;
            const res = await fetch(queryUrl);
            const data = await res.json();

            if (data.error) {
              resultsDiv.innerHTML = "<p style='color:#f87171; text-align:center;'>Error: " + data.error + "</p>";
              return;
            }

            // Extract hotel array correctly across API response structures
            let properties = data.properties || 
                             data.data?.propertySearch?.properties || 
                             data.data?.properties || [];

            if (!properties || properties.length === 0) {
              resultsDiv.innerHTML = "<p style='color:white; text-align:center;'>No hotels found for " + city + " on selected dates.</p>";
              return;
            }

            resultsHeader.innerText = "Top " + Math.min(properties.length, 20) + " Hotels in " + city;
            let html = "";

            // Up to 20 hotels render loop
            properties.slice(0, 20).forEach(hotel => {
              const name = hotel.name || "Luxury Hotel & Resort";
              const neighborhood = hotel.neighborhood?.name || hotel.destinationInfo?.distanceFromDestination?.get || city;

              // Parsing exact image URL from nested Hotels.com object
              let img = "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg"; 
              if (hotel.propertyImage?.image?.url) {
                img = hotel.propertyImage.image.url;
              } else if (hotel.propertyImage?.image?.fallbackUrl) {
                img = hotel.propertyImage.image.fallbackUrl;
              } else if (hotel.primaryImageUrl) {
                img = hotel.primaryImageUrl;
              }

              // Deep inspection for Price Parsing
              let price = "Contact for Price";
              if (hotel.price?.lead?.formatted) {
                price = hotel.price.lead.formatted;
              } else if (hotel.price?.options?.[0]?.formattedDisplayPrice) {
                price = hotel.price.options[0].formattedDisplayPrice;
              } else if (hotel.price?.options?.[0]?.strikeThrough?.formatted) {
                price = hotel.price.options[0].strikeThrough.formatted;
              } else if (hotel.price?.lead?.amount) {
                price = "₹" + hotel.price.lead.amount;
              }

              // Dynamic WhatsApp Lead Link
              const msg = encodeURIComponent(
                "Hi Sheet Holidays, I want to book: " + name + 
                "\\nCity: " + city + 
                "\\nCheck-in: " + checkin + 
                "\\nCheck-out: " + checkout + 
                "\\nGuests: " + adults + " Adults, " + rooms + " Room(s)" +
                "\\nQuoted Price: " + price
              );
              const waLink = "https://wa.me/917388442233?text=" + msg;

              html += \`
                <div class="hotel-card">
                  <div class="hotel-img-container">
                    <img src="\${img}" class="hotel-img" alt="\${name}" onerror="this.src='https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg'">
                    <div class="location-badge">📍 \${neighborhood}</div>
                  </div>
                  <div class="hotel-info">
                    <div class="hotel-name">\${name}</div>
                    <div class="price-container">
                      <div>
                        <div class="price-label">Price per night starting from</div>
                        <div class="price-tag">\${price}</div>
                      </div>
                    </div>
                    <a href="\${waLink}" target="_blank" class="wa-btn">
                      📱 Book via WhatsApp
                    </a>
                  </div>
                </div>
              \`;
            });

            resultsDiv.innerHTML = html;

          } catch (err) {
            console.error(err);
            resultsDiv.innerHTML = "<p style='color:#f87171; text-align:center;'>Failed to load hotels. Check API Key or Backend logs.</p>";
          }
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
