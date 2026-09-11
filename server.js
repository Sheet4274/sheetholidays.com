const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Common Header Navigation HTML Template
const navbarHTML = (activePage) => `
  <header style="background:#0f172a; padding:15px 5%; display:flex; justify-content:space-between; align-items:center; color:#fff; position:sticky; top:0; z-index:1000; box-shadow:0 2px 10px rgba(0,0,0,0.2);">
    <a href="/" style="font-size:1.4rem; font-weight:900; color:#38bdf8; text-decoration:none; display:flex; align-items:center; gap:8px;">
      <i class="fas fa-globe-asia"></i> Sheet Holidays
    </a>
    <nav style="display:flex; gap:18px; align-items:center; flex-wrap:wrap;">
      <a href="/" style="color:${activePage==='home'?'#38bdf8':'#cbd5e1'}; text-decoration:none; font-weight:700; font-size:0.9rem;">Home</a>
      <a href="/hotels" style="color:${activePage==='hotels'?'#38bdf8':'#cbd5e1'}; text-decoration:none; font-weight:700; font-size:0.9rem;">Hotels</a>
      <a href="/packages" style="color:${activePage==='packages'?'#38bdf8':'#cbd5e1'}; text-decoration:none; font-weight:700; font-size:0.9rem;">Holiday Packages</a>
      <a href="/cabs" style="color:${activePage==='cabs'?'#38bdf8':'#cbd5e1'}; text-decoration:none; font-weight:700; font-size:0.9rem;">Taxi Services</a>
      <a href="/contact" style="color:${activePage==='contact'?'#38bdf8':'#cbd5e1'}; text-decoration:none; font-weight:700; font-size:0.9rem;">Contact Us</a>
    </nav>
  </header>
`;

const headHTML = (title) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; font-family: 'Lato', sans-serif; margin:0; padding:0; }
    body { background: #f1f5f9; color: #1e293b; }
  </style>
</head>
<body>
`;

// 1. Home Page Route (Handles both '/' and '/home')
app.get(['/', '/home'], (req, res) => {
  res.send(`
    ${headHTML('Sheet Holidays | Home')}
    ${navbarHTML('home')}
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 60px 20px; text-align: center; color: #fff;">
      <h1 style="font-size: 2.5rem; font-weight: 900; margin-bottom: 10px; color: #38bdf8;">Welcome to Sheet Holidays</h1>
      <p style="font-size: 1.1rem; color: #94a3b8; margin-bottom: 30px;">Your Trusted Partner for Pan-India 3-Star Hotels, Tour Packages & Taxi Rentals</p>
    </div>
    <div style="max-width: 900px; margin: -30px auto 40px; padding: 0 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; position: relative; z-index: 10;">
      <div style="background: #fff; padding: 25px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e2e8f0;">
        <i class="fas fa-hotel" style="font-size: 2.5rem; color: #2563eb; margin-bottom: 15px;"></i>
        <h3 style="font-size: 1.2rem; font-weight: 900; margin-bottom: 8px; color: #0f172a;">Hotels & Stays</h3>
        <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 15px;">Verified 3-star accommodations across all major Indian cities.</p>
        <a href="/hotels" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 0.9rem;">Explore Hotels</a>
      </div>
      <div style="background: #fff; padding: 25px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e2e8f0;">
        <i class="fas fa-suitcase-rolling" style="font-size: 2.5rem; color: #2563eb; margin-bottom: 15px;"></i>
        <h3 style="font-size: 1.2rem; font-weight: 900; margin-bottom: 8px; color: #0f172a;">Holiday Packages</h3>
        <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 15px;">Custom handpicked itineraries including Kashmir, Kerala, Goa, and more.</p>
        <a href="/packages" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 0.9rem;">View Packages</a>
      </div>
      <div style="background: #fff; padding: 25px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e2e8f0;">
        <i class="fas fa-taxi" style="font-size: 2.5rem; color: #2563eb; margin-bottom: 15px;"></i>
        <h3 style="font-size: 1.2rem; font-weight: 900; margin-bottom: 8px; color: #0f172a;">Taxi Services</h3>
        <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 15px;">Reliable outstation cabs, one-way drops, and local rentals.</p>
        <a href="/cabs" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 0.9rem;">Book Cabs</a>
      </div>
    </div>
  </body>
  </html>
  `);
});

// 2. Hotels Page Route
app.get('/hotels', (req, res) => {
  res.send(`
    ${headHTML('Sheet Holidays | Hotels')}
    ${navbarHTML('hotels')}
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 30px 15px; color: #fff;">
      <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 20px; box-shadow: 0 15px 30px rgba(0,0,0,0.2); color: #333;">
        <div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:14px;">🔍 Find 3-Star Hotels</div>
        <div style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; background: #f8fafc; margin-bottom:14px;">
          <label style="font-size: 10px; font-weight: 800; color: #64748b; display: block; text-transform: uppercase; margin-bottom: 2px;">Enter City</label>
          <input type="text" id="cityInput" value="Mumbai" style="border: none; background: transparent; font-size: 15px; width: 100%; outline: none; font-weight: 700; color: #0f172a;">
        </div>
        <button onclick="searchHotels()" style="background: #2563eb; color: white; border: none; width: 100%; padding: 15px; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer;">Search Hotels</button>
      </div>
    </div>
    <div style="max-width: 650px; margin: 20px auto; padding: 0 12px;" id="results">
      <div style="text-align: center; padding: 40px; color: #64748b; font-weight: 600;">Loading...</div>
    </div>
    <script>
      let cachedHotels = [];
      window.onload = function() { searchHotels(); };
      async function searchHotels() {
        const city = document.getElementById('cityInput').value.trim() || "Mumbai";
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = "<div style='text-align:center; padding:40px; color:#64748b;'>Fetching hotels...</div>";
        try {
          const res = await fetch('/api/hotels?city=' + encodeURIComponent(city));
          const data = await res.json();
          cachedHotels = data.hotels || [];
          if (!cachedHotels.length) { resultsDiv.innerHTML = "<p style='text-align:center;'>No hotels found.</p>"; return; }
          renderHotels();
        } catch(e) { resultsDiv.innerHTML = "<p style='color:red; text-align:center;'>Error loading data.</p>"; }
      }
      let currentIndices = {};
      function renderHotels() {
        document.getElementById('results').innerHTML = cachedHotels.map((hotel, idx) => {
          if (currentIndices[idx] === undefined) currentIndices[idx] = 0;
          const imgs = hotel.photos.map(p => '<img src="' + p + '" style="min-width:100%; height:100%; object-fit:cover;">').join('');
          return \`
            <div style="background: #ffffff; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow:hidden;">
              <div style="position: relative; width: 100%; height: 220px; background: #0f172a;">
                <div style="display: flex; width: 100%; height: 100%; transition: transform 0.4s;" id="track_\${idx}">\${imgs}</div>
                <button onclick="slideImage(\${idx}, -1)" style="position: absolute; top: 50%; transform: translateY(-50%); left: 10px; background: rgba(0,0,0,0.5); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; z-index: 10;">❮</button>
                <button onclick="slideImage(\${idx}, 1)" style="position: absolute; top: 50%; transform: translateY(-50%); right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; z-index: 10;">❯</button>
              </div>
              <div style="padding: 18px;">
                <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">\${hotel.name}</div>
                <div style="font-size: 13px; color: #64748b; margin-bottom: 10px;">📍 \${hotel.location}</div>
                <a href="https://wa.me/917388442233?text=\${encodeURIComponent('Booking Enquiry for: ' + hotel.name)}" target="_blank" style="background: #25D366; color: white; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: 12px; text-decoration: none; font-weight: 800; width: 100%; font-size: 14px; margin-top: 10px;"><i class="fab fa-whatsapp"></i> Book via WhatsApp</a>
              </div>
            </div>
          \`;
        }).join('');
      }
      function slideImage(idx, dir) {
        const total = cachedHotels[idx].photos.length;
        currentIndices[idx] = (currentIndices[idx] + dir + total) % total;
        document.getElementById('track_' + idx).style.transform = 'translateX(-' + (currentIndices[idx] * 100) + '%)';
      }
    </script>
  </body>
  </html>
  `);
});

// 3. Holiday Packages Page Route
app.get('/packages', (req, res) => {
  res.send(`
    ${headHTML('Sheet Holidays | Packages')}
    ${navbarHTML('packages')}
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 35px 15px; text-align: center; color: #fff;">
      <h1>Holiday Tour Packages</h1>
    </div>
    <div style="max-width: 950px; margin: 30px auto; padding: 0 15px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        <div style="background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="height: 180px;"><img src="https://images.pexels.com/photos/3408354/pexels-photo-3408354.jpeg?auto=compress&cs=tinysrgb&w=800" style="width: 100%; height: 100%; object-fit: cover;"></div>
          <div style="padding: 18px;">
            <h3>Kashmir Paradise</h3>
            <p style="color:#64748b; font-size:13px; margin:6px 0;">6 Days / 5 Nights</p>
            <a href="https://wa.me/917388442233?text=Enquiry%20Kashmir" target="_blank" style="background: #25D366; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: 800; width: 100%; margin-top: 12px;"><i class="fab fa-whatsapp"></i> Enquire</a>
          </div>
        </div>
        <div style="background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="height: 180px;"><img src="https://images.pexels.com/photos/962464/pexels-photo-962464.jpeg?auto=compress&cs=tinysrgb&w=800" style="width: 100%; height: 100%; object-fit: cover;"></div>
          <div style="padding: 18px;">
            <h3>Kerala Backwaters</h3>
            <p style="color:#64748b; font-size:13px; margin:6px 0;">6 Days / 5 Nights</p>
            <a href="https://wa.me/917388442233?text=Enquiry%20Kerala" target="_blank" style="background: #25D366; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: 800; width: 100%; margin-top: 12px;"><i class="fab fa-whatsapp"></i> Enquire</a>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
});

// 4. Taxi Services Page Route
app.get('/cabs', (req, res) => {
  res.send(`
    ${headHTML('Sheet Holidays | Cabs')}
    ${navbarHTML('cabs')}
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 35px 15px; text-align: center; color: #fff;">
      <h1>Taxi & Cab Rentals</h1>
    </div>
    <div style="max-width: 550px; margin: 30px auto; padding: 0 15px;">
      <div style="background: #fff; border-radius: 16px; padding: 25px; border: 1px solid #e2e8f0;">
        <div style="border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px; background: #f8fafc; margin-bottom: 12px;">
          <select id="tripType" style="width: 100%; border: none; background: transparent; font-size: 14px; font-weight: 700; outline: none;"><option>One-Way Drop</option><option>Round Trip</option></select>
        </div>
        <div style="border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px; background: #f8fafc; margin-bottom: 12px;">
          <input type="text" id="pickupLocation" placeholder="Pickup Location" style="width: 100%; border: none; background: transparent; font-size: 14px; font-weight: 700; outline: none;">
        </div>
        <button onclick="bookCab()" style="background: #25D366; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 800; width: 100%; border:none; cursor:pointer;"><i class="fab fa-whatsapp"></i> Book Cab</button>
      </div>
    </div>
    <script>
      function bookCab() {
        const type = document.getElementById('tripType').value;
        const pickup = document.getElementById('pickupLocation').value || "City";
        window.open("https://wa.me/917388442233?text=" + encodeURIComponent("Cab Booking: " + type + " from " + pickup), "_blank");
      }
    </script>
  </body>
  </html>
  `);
});

// 5. Contact Us Page Route (With Lucknow & Katra Office details)
app.get('/contact', (req, res) => {
  res.send(`
    ${headHTML('Sheet Holidays | Contact Us')}
    ${navbarHTML('contact')}
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 35px 15px; text-align: center; color: #fff;">
      <h1>Get in Touch With Us</h1>
      <p style="color:#94a3b8; font-size:0.95rem; margin-top:5px;">Visit or reach out to our offices for best holiday deals</p>
    </div>
    <div style="max-width: 900px; margin: 30px auto; padding: 0 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
      
      <!-- Lucknow Head Office -->
      <div style="background: #fff; border-radius: 16px; padding: 25px; border: 1.5px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
        <i class="fas fa-building" style="font-size: 2.2rem; color: #2563eb; margin-bottom: 12px;"></i>
        <h3 style="font-size: 1.2rem; font-weight: 900; color: #0f172a; margin-bottom: 8px;">Lucknow Head Office</h3>
        <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 15px; line-height: 1.5;">533/79, Pratapbag, Aliganj, Lucknow, Uttar Pradesh - 226024</p>
        <a href="https://wa.me/917388442233?text=Enquiry%20Lucknow%20Office" target="_blank" style="background: #25D366; color: white; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.9rem; width: 100%;">
          <i class="fab fa-whatsapp"></i> +91 73884 42233 (Chat)
        </a>
      </div>

      <!-- Katra Branch Office -->
      <div style="background: #fff; border-radius: 16px; padding: 25px; border: 1.5px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
        <i class="fas fa-store" style="font-size: 2.2rem; color: #2563eb; margin-bottom: 12px;"></i>
        <h3 style="font-size: 1.2rem; font-weight: 900; color: #0f172a; margin-bottom: 8px;">Katra Branch Office</h3>
        <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 15px; line-height: 1.5;">Shop No. 206, Railway Road, Katra - 182301</p>
        <a href="https://wa.me/918715850050?text=Enquiry%20Katra%20Office" target="_blank" style="background: #25D366; color: white; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.9rem; width: 100%;">
          <i class="fab fa-whatsapp"></i> +91 87158 50050 (Chat)
        </a>
      </div>

    </div>
  </body>
  </html>
  `);
});

// Hotel API Route
app.get('/api/hotels', async (req, res) => {
  try {
    const city = req.query.city || "Mumbai";
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY missing on server." });
    }
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json`, {
      params: { query: `3 star hotels in ${city}`, type: 'lodging', key: GOOGLE_API_KEY }
    });
    
    const results = response.data?.results || [];
    const hotels = results.slice(0, 20).map((place, index) => ({
      id: index,
      name: place.name,
      location: place.formatted_address || place.vicinity || city,
      rating: place.rating ? `⭐ ${place.rating}` : "⭐ 3-Star Verified",
      photos: place.photos ? place.photos.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${GOOGLE_API_KEY}`) : ["https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800"]
    }));
    res.json({ hotels, city });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
