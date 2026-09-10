require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

const API_BASE = `https://${RAPIDAPI_HOST}`;

// ----------------------------------------------------
// DATES HELPER
// ----------------------------------------------------
function defaultDates() {
  const now = new Date();
  const checkin = new Date(now);
  checkin.setDate(checkin.getDate() + 1);

  const checkout = new Date(now);
  checkout.setDate(checkout.getDate() + 3);

  const format = d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return { checkin: format(checkin), checkout: format(checkout) };
}

// ----------------------------------------------------
// REGION FINDER (HOTELS.COM)
// ----------------------------------------------------
async function findRegion(city) {
  const response = await axios.get(`${API_BASE}/v2/regions`, {
    params: { query: city, locale: "en_US", domain: "US" },
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST
    },
    timeout: 20000
  });

  const regions = response.data?.data || [];
  if (!regions.length) {
    throw new Error(`City '${city}' not found.`);
  }

  // Find CITY or NEIGHBORHOOD or pick the first item
  const selected = regions.find(r => r.type === "CITY" || r.type === "NEIGHBORHOOD") || regions[0];
  const gaiaId = selected.gaiaId || selected.id;

  if (!gaiaId) {
    throw new Error(`Region ID not found for '${city}'.`);
  }

  return { gaiaId, name: selected.regionNames?.displayName || city };
}

// ----------------------------------------------------
// PARSERS
// ----------------------------------------------------
function parsePrice(hotel) {
  try {
    const p1 = hotel.price?.lead?.formatted;
    if (p1) return { amount: p1 };

    const p2 = hotel.price?.options?.[0]?.formattedDisplayPrice;
    if (p2) return { amount: p2 };

    const numVal = hotel.price?.lead?.amount || hotel.price?.raw?.value;
    if (numVal && !isNaN(numVal)) {
      return { amount: "₹" + Math.round(Number(numVal)).toLocaleString("en-IN") };
    }
  } catch (e) {}
  return { amount: "Price on Request" };
}

function parseImage(hotel) {
  try {
    let rawUrl = "";
    if (Array.isArray(hotel.cardPhotos) && hotel.cardPhotos.length > 0) {
      rawUrl = hotel.cardPhotos[0]?.image?.url || hotel.cardPhotos[0]?.url || "";
    }
    if (!rawUrl && Array.isArray(hotel.propertyImages) && hotel.propertyImages.length > 0) {
      rawUrl = hotel.propertyImages[0]?.image?.url || hotel.propertyImages[0]?.url || "";
    }
    if (!rawUrl) {
      rawUrl = hotel.propertyImage?.image?.url || hotel.propertyImage?.url || "";
    }
    if (rawUrl) {
      rawUrl = rawUrl.replace("{size}", "z");
      if (rawUrl.startsWith("//")) rawUrl = "https:" + rawUrl;
      return rawUrl;
    }
  } catch (e) {}
  return null;
}

// ----------------------------------------------------
// SEARCH ENDPOINT
// ----------------------------------------------------
app.get("/api/hotels", async (req, res) => {
  try {
    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ status: false, error: "RAPIDAPI_KEY missing on Render environment variables" });
    }

    let { city, checkin, checkout, adults, rooms } = req.query;
    city = city || "Mumbai";
    const dates = defaultDates();

    checkin = checkin || dates.checkin;
    checkout = checkout || dates.checkout;
    adults = adults || "2";
    rooms = rooms || "1";

    const { gaiaId, name: cityName } = await findRegion(city);

    const response = await axios.get(`${API_BASE}/v3/hotels/search`, {
      params: {
        region_id: gaiaId,
        locale: "en_US",
        domain: "US",
        checkin_date: checkin,
        checkout_date: checkout,
        sort_order: "RECOMMENDED",
        adults_number: adults,
        rooms_number: rooms,
        currency: "INR",
        page_number: "1"
      },
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST
      },
      timeout: 30000
    });

    const properties =
      response.data?.properties ||
      response.data?.data?.propertySearch?.properties ||
      [];

    const hotels = properties.slice(0, 15).map(h => ({
      hotel_id: h.id,
      name: h.name || "Luxury Stay",
      rating: h.reviews?.score || h.star || null,
      image: parseImage(h),
      price: parsePrice(h)
    }));

    res.json({
      status: true,
      destination: { name: cityName, region_id: gaiaId },
      dates: { checkin, checkout },
      guests: { adults, rooms },
      hotels
    });

  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    res.status(500).json({
      status: false,
      error: typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails
    });
  }
});

// ----------------------------------------------------
// FRONTEND UI
// ----------------------------------------------------
app.get("*", (req, res) => {
  const dates = defaultDates();
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sheet Holidays - Hotels</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, sans-serif; background: #07111f; color: white; }
.header { background: #ffffff; height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; position: sticky; top: 0; z-index: 100; }
.logo { color: #111827; font-size: 20px; font-weight: 800; }
.container { max-width: 700px; margin: auto; padding: 15px; }
.search { background: #111d30; border: 1px solid #26364d; padding: 16px; border-radius: 18px; margin-bottom: 22px; }
label { font-size: 11px; color: #94a3b8; font-weight: bold; display: block; margin-bottom: 6px; }
input, select { width: 100%; border: 1px solid #334155; background: #07111f; color: white; padding: 13px; border-radius: 10px; font-size: 14px; outline: none; }
.field { margin-bottom: 12px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.searchBtn { width: 100%; border: 0; padding: 14px; border-radius: 30px; background: #16a34a; color: white; font-size: 17px; font-weight: 800; margin-top: 5px; cursor: pointer; }
.title { font-size: 20px; font-weight: 800; margin: 20px 0 14px; }
.hotel { background: #111d30; border: 1px solid #26364d; border-radius: 18px; overflow: hidden; margin-bottom: 20px; }
.hotelImage { width: 100%; height: 230px; object-fit: cover; display: block; background: #172235; }
.hotelBody { padding: 15px; }
.hotelName { font-size: 19px; font-weight: 800; margin-bottom: 7px; }
.rating { color: #fbbf24; font-size: 14px; margin-bottom: 8px; }
.price { color: #34d399; font-size: 23px; font-weight: 900; margin: 10px 0; }
.price small { color: #94a3b8; font-size: 12px; font-weight: normal; }
.book { display: block; text-decoration: none; text-align: center; background: #16a34a; color: white; padding: 13px; border-radius: 10px; font-size: 16px; font-weight: 800; }
.loading { text-align: center; color: #94a3b8; padding: 30px; }
.error { background: #3f1620; border: 1px solid #7f1d1d; padding: 15px; border-radius: 12px; color: #fecaca; }
.noImage { height: 230px; display: flex; align-items: center; justify-content: center; background: #172235; color: #64748b; font-size: 14px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">SHEET HOLIDAYS</div>
</div>
<div class="container">
  <div class="search">
    <div class="field">
      <label>DESTINATION</label>
      <input id="city" value="Mumbai" placeholder="Mumbai, Goa, Delhi...">
    </div>
    <div class="row">
      <div class="field">
        <label>CHECK-IN</label>
        <input id="checkin" type="date" value="${dates.checkin}">
      </div>
      <div class="field">
        <label>CHECK-OUT</label>
        <input id="checkout" type="date" value="${dates.checkout}">
      </div>
    </div>
    <div class="row">
      <div class="field">
        <label>ADULTS</label>
        <select id="adults">
          <option value="1">1 Adult</option>
          <option value="2" selected>2 Adults</option>
          <option value="3">3 Adults</option>
          <option value="4">4 Adults</option>
        </select>
      </div>
      <div class="field">
        <label>ROOMS</label>
        <select id="rooms">
          <option value="1" selected>1 Room</option>
          <option value="2">2 Rooms</option>
          <option value="3">3 Rooms</option>
        </select>
      </div>
    </div>
    <button class="searchBtn" onclick="searchHotels()">🔍 Search Hotels</button>
  </div>
  <div class="title" id="title">Popular Hotels</div>
  <div id="results"><div class="loading">Loading hotels...</div></div>
</div>
<script>
function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function createCard(hotel) {
  const name = escapeHtml(hotel.name || "Hotel");
  const rating = hotel.rating ? "⭐ " + hotel.rating : "";
  const price = hotel.price?.amount || "Rates on Request";
  const image = hotel.image;

  const city = document.getElementById("city").value;
  const checkin = document.getElementById("checkin").value;
  const checkout = document.getElementById("checkout").value;
  const adults = document.getElementById("adults").value;
  const rooms = document.getElementById("rooms").value;

  const message = encodeURIComponent("Hi Sheet Holidays!\\n\\nI want to book:\\n" + name + "\\n\\nDestination: " + city + "\\nCheck-in: " + checkin + "\\nCheck-out: " + checkout + "\\nAdults: " + adults + "\\nRooms: " + rooms + "\\n\\nPrice: " + price);
  const whatsapp = "https://wa.me/917388442233?text=" + message;

  const photoHtml = image 
    ? \`<img class="hotelImage" src="\${image}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="noImage" style="display:none">Hotel photo unavailable</div>\`
    : \`<div class="noImage">Hotel photo unavailable</div>\`;

  return \`
    <div class="hotel">
      \${photoHtml}
      <div class="hotelBody">
        <div class="hotelName">\${name}</div>
        <div class="rating">\${rating}</div>
        <div class="price">\${price} <small>/ selected stay</small></div>
        <a class="book" href="\${whatsapp}" target="_blank">💬 Book on WhatsApp</a>
      </div>
    </div>
  \`;
}

async function searchHotels() {
  const city = document.getElementById("city").value.trim();
  const checkin = document.getElementById("checkin").value;
  const checkout = document.getElementById("checkout").value;
  const adults = document.getElementById("adults").value;
  const rooms = document.getElementById("rooms").value;

  const results = document.getElementById("results");
  const title = document.getElementById("title");

  if (!city || !checkin || !checkout) {
    alert("City aur Dates select karein");
    return;
  }

  title.innerText = "Searching hotels in " + city + "...";
  results.innerHTML = \`<div class="loading">🔄 Finding live hotels & prices...</div>\`;

  try {
    let url = \`/api/hotels?city=\${encodeURIComponent(city)}&checkin=\${checkin}&checkout=\${checkout}&adults=\${adults}&rooms=\${rooms}\`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.error || "Hotels Search Error");
    }

    const hotels = data.hotels || [];
    title.innerText = "Hotels in " + (data.destination?.name || city);

    if (!hotels.length) {
      results.innerHTML = \`<div class="error">Is destination ke liye hotels nahi mile.</div>\`;
      return;
    }

    results.innerHTML = hotels.map(createCard).join("");
  } catch (error) {
    results.innerHTML = \`<div class="error"><b>Hotel search failed</b><br><br>\${escapeHtml(error.message)}</div>\`;
  }
}

window.addEventListener("load", searchHotels);
</script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
