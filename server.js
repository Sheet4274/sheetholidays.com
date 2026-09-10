require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "booking-com15.p.rapidapi.com";

const API_BASE = `https://${RAPIDAPI_HOST}`;

// ----------------------------------------------------
// DATES
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

  return {
    checkin: format(checkin),
    checkout: format(checkout)
  };
}

// ----------------------------------------------------
// DESTINATION
// ----------------------------------------------------
async function findDestination(city) {
  const response = await axios.get(`${API_BASE}/api/v1/hotels/searchDestination`, {
    params: { query: city },
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST
    },
    timeout: 20000
  });

  const list = response.data?.data || [];
  if (!list.length) {
    throw new Error(`Destination not found: ${city}`);
  }

  return list.find(x => String(x.search_type || "").toLowerCase() === "city") || list[0];
}

// ----------------------------------------------------
// PHOTO FINDER
// ----------------------------------------------------
function findImage(obj) {
  if (!obj || typeof obj !== "object") return null;

  const possibleKeys = [
    "url", "image_url", "imageUrl", "photo_url", "photoUrl",
    "thumbnail", "thumbnail_url", "thumbnailUrl", "full_url", "fullUrl", "src"
  ];

  for (const key of possibleKeys) {
    if (typeof obj[key] === "string") {
      const value = obj[key];
      if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//")) {
        return value.startsWith("//") ? "https:" + value : value;
      }
    }
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findImage(item);
        if (found) return found;
      }
    } else if (value && typeof value === "object") {
      const found = findImage(value);
      if (found) return found;
    }
  }

  return null;
}

async function getHotelPhoto(hotelId) {
  try {
    const response = await axios.get(`${API_BASE}/api/v1/hotels/getHotelPhotos`, {
      params: { hotel_id: hotelId },
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
      },
      timeout: 15000
    });

    const data = response.data?.data || response.data;
    return findImage(data);
  } catch (error) {
    return null;
  }
}

// ----------------------------------------------------
// HELPER PARSERS
// ----------------------------------------------------
function getPrice(hotel) {
  const price =
    hotel?.priceBreakdown?.grossPrice?.value ??
    hotel?.priceBreakdown?.grossPrice?.amount ??
    hotel?.compositePriceBreakdown?.grossAmount?.value ??
    hotel?.price?.value ?? null;

  if (price === null || price === undefined) return null;

  const currency = hotel?.priceBreakdown?.grossPrice?.currency || "INR";
  const numeric = Number(price);

  return Number.isFinite(numeric) ? { amount: Math.round(numeric), currency } : null;
}

function getHotelName(hotel) {
  return hotel?.property?.name || hotel?.property?.hotel_name || hotel?.name || "Hotel Stay";
}

function getRating(hotel) {
  return hotel?.property?.reviewScore || hotel?.property?.review_score || hotel?.reviewScore || null;
}

// ----------------------------------------------------
// SEARCH API ENDPOINT
// ----------------------------------------------------
app.get("/api/hotels", async (req, res) => {
  try {
    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ status: false, error: "RAPIDAPI_KEY environment variable missing on Render." });
    }

    let { city, checkin, checkout, adults, rooms, children_age } = req.query;
    city = city || "Goa";
    const dates = defaultDates();

    checkin = checkin || dates.checkin;
    checkout = checkout || dates.checkout;
    adults = adults || "2";
    rooms = rooms || "1";

    const destination = await findDestination(city);
    const destId = destination.dest_id;
    const searchType = destination.search_type || "city";

    const params = {
      dest_id: destId,
      search_type: searchType,
      arrival_date: checkin,
      departure_date: checkout,
      adults: adults,
      room_qty: rooms,
      page_number: "1",
      currency_code: "INR",
      languagecode: "en-us"
    };

    if (children_age) params.children_age = children_age;

    const response = await axios.get(`${API_BASE}/api/v1/hotels/searchHotels`, {
      params,
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
      },
      timeout: 30000
    });

    const hotels = response.data?.data?.hotels || response.data?.data?.result || response.data?.hotels || [];
    const selectedHotels = hotels.slice(0, 15);

    const finalHotels = await Promise.all(
      selectedHotels.map(async hotel => {
        const hotelId = hotel?.hotel_id || hotel?.hotelId || hotel?.property?.id;
        let image = null;

        if (hotelId) {
          image = await getHotelPhoto(hotelId);
        }

        return {
          hotel_id: hotelId,
          name: getHotelName(hotel),
          rating: getRating(hotel),
          image: image,
          price: getPrice(hotel)
        };
      })
    );

    res.json({
      status: true,
      destination: { name: destination.name || city, dest_id: destId, search_type: searchType },
      dates: { checkin, checkout },
      guests: { adults, rooms, children_age: children_age || "" },
      hotels: finalHotels
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      error: "Hotel search failed",
      details: error.response?.data || error.message
    });
  }
});

// ----------------------------------------------------
// FRONTEND APP
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
      <input id="city" value="Goa" placeholder="Goa, Mumbai, Delhi...">
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
    <div class="field">
      <label>CHILDREN AGES</label>
      <input id="children" placeholder="Example: 5,10 (optional)">
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

function money(price) {
  if (!price || !price.amount) return "Price unavailable";
  return "₹" + Number(price.amount).toLocaleString("en-IN");
}

function createCard(hotel) {
  const name = escapeHtml(hotel.name || "Hotel");
  const rating = hotel.rating ? "⭐ " + hotel.rating : "";
  const price = money(hotel.price);
  const image = hotel.image;

  const city = document.getElementById("city").value;
  const checkin = document.getElementById("checkin").value;
  const checkout = document.getElementById("checkout").value;
  const adults = document.getElementById("adults").value;
  const rooms = document.getElementById("rooms").value;
  const children = document.getElementById("children").value;

  const message = encodeURIComponent("Hi Sheet Holidays!\\n\\nI want to book:\\n" + name + "\\n\\nDestination: " + city + "\\nCheck-in: " + checkin + "\\nCheck-out: " + checkout + "\\nAdults: " + adults + "\\nRooms: " + rooms + "\\nChildren: " + (children || "0") + "\\n\\nPrice: " + price);
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
  const children = document.getElementById("children").value.trim();

  const results = document.getElementById("results");
  const title = document.getElementById("title");

  if (!city || !checkin || !checkout) {
    alert("City aur Dates select karein");
    return;
  }

  title.innerText = "Searching hotels in " + city + "...";
  results.innerHTML = \`<div class="loading">🔄 Finding live hotels, prices & photos...</div>\`;

  try {
    let url = \`/api/hotels?city=\${encodeURIComponent(city)}&checkin=\${checkin}&checkout=\${checkout}&adults=\${adults}&rooms=\${rooms}\`;
    if (children) url += \`&children_age=\${encodeURIComponent(children)}\`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.details?.message || data.error || "Hotel API error");
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
  console.log(`Server listening on port ${PORT}`);
});
