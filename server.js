require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || "booking-com15.p.rapidapi.com";

const API_BASE = `https://${RAPIDAPI_HOST}`;

const headers = {
  "X-RapidAPI-Key": RAPIDAPI_KEY,
  "X-RapidAPI-Host": RAPIDAPI_HOST
};

// ----------------------------------------------------
// DATE
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
  const response = await axios.get(
    `${API_BASE}/api/v1/hotels/searchDestination`,
    {
      params: {
        query: city
      },
      headers,
      timeout: 20000
    }
  );

  const list = response.data?.data || [];

  if (!list.length) {
    throw new Error(`Destination not found: ${city}`);
  }

  // Prefer city
  const cityResult =
    list.find(x =>
      String(x.search_type || "").toLowerCase() === "city"
    ) || list[0];

  return cityResult;
}

// ----------------------------------------------------
// REAL HOTEL PHOTO
// ----------------------------------------------------

function findImage(obj) {
  if (!obj || typeof obj !== "object") return null;

  const possibleKeys = [
    "url",
    "image_url",
    "imageUrl",
    "photo_url",
    "photoUrl",
    "thumbnail",
    "thumbnail_url",
    "thumbnailUrl",
    "full_url",
    "fullUrl",
    "src"
  ];

  for (const key of possibleKeys) {
    if (typeof obj[key] === "string") {
      const value = obj[key];

      if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("//")
      ) {
        return value.startsWith("//")
          ? "https:" + value
          : value;
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

// ----------------------------------------------------
// GET REAL HOTEL PHOTOS
// ----------------------------------------------------

async function getHotelPhoto(hotelId) {
  try {
    const response = await axios.get(
      `${API_BASE}/api/v1/hotels/getHotelPhotos`,
      {
        params: {
          hotel_id: hotelId
        },
        headers,
        timeout: 20000
      }
    );

    const data = response.data?.data || response.data;

    const image = findImage(data);

    return image || null;
  } catch (error) {
    console.log(
      "PHOTO ERROR",
      hotelId,
      error.response?.status || error.message
    );

    return null;
  }
}

// ----------------------------------------------------
// PRICE
// ----------------------------------------------------

function getPrice(hotel) {
  const price =
    hotel?.priceBreakdown?.grossPrice?.value ??
    hotel?.priceBreakdown?.grossPrice?.amount ??
    hotel?.priceBreakdown?.grossPrice?.valueWithTax ??
    hotel?.priceBreakdown?.strikethroughPrice?.value ??
    hotel?.compositePriceBreakdown?.grossAmount?.value ??
    hotel?.compositePriceBreakdown?.grossAmount?.amount ??
    hotel?.price?.value ??
    hotel?.price?.amount ??
    null;

  if (price === null || price === undefined) {
    return null;
  }

  const currency =
    hotel?.priceBreakdown?.grossPrice?.currency ||
    hotel?.compositePriceBreakdown?.grossAmount?.currency ||
    "INR";

  const numeric = Number(price);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return {
    amount: Math.round(numeric),
    currency: currency
  };
}

// ----------------------------------------------------
// HOTEL NAME
// ----------------------------------------------------

function getHotelName(hotel) {
  return (
    hotel?.property?.name ||
    hotel?.property?.hotel_name ||
    hotel?.name ||
    "Hotel"
  );
}

// ----------------------------------------------------
// HOTEL RATING
// ----------------------------------------------------

function getRating(hotel) {
  return (
    hotel?.property?.reviewScore ||
    hotel?.property?.review_score ||
    hotel?.reviewScore ||
    null
  );
}

// ----------------------------------------------------
// HOTEL SEARCH
// ----------------------------------------------------

app.get("/api/hotels", async (req, res) => {
  try {
    if (!RAPIDAPI_KEY) {
      return res.status(500).json({
        status: false,
        error: "RAPIDAPI_KEY missing"
      });
    }

    let {
      city,
      checkin,
      checkout,
      adults,
      rooms,
      children_age
    } = req.query;

    city = city || "Goa";

    const dates = defaultDates();

    checkin = checkin || dates.checkin;
    checkout = checkout || dates.checkout;
    adults = adults || "2";
    rooms = rooms || "1";

    // ------------------------------------------
    // STEP 1 - DESTINATION
    // ------------------------------------------

    const destination = await findDestination(city);

    const destId = destination.dest_id;
    const searchType =
      destination.search_type || "city";

    console.log(
      `SEARCH: ${city} | DEST: ${destId} | TYPE: ${searchType}`
    );

    // ------------------------------------------
    // STEP 2 - LIVE HOTEL SEARCH
    // ------------------------------------------

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

    if (children_age) {
      params.children_age = children_age;
    }

    const response = await axios.get(
      `${API_BASE}/api/v1/hotels/searchHotels`,
      {
        params,
        headers,
        timeout: 30000
      }
    );

    const hotels =
      response.data?.data?.hotels ||
      response.data?.data?.result ||
      response.data?.hotels ||
      [];

    console.log(
      `HOTELS FOUND: ${hotels.length}`
    );

    // ------------------------------------------
    // STEP 3 - REAL PHOTOS
    // Only first 20 hotels
    // ------------------------------------------

    const selectedHotels = hotels.slice(0, 20);

    const finalHotels = await Promise.all(
      selectedHotels.map(async hotel => {

        const hotelId =
          hotel?.hotel_id ||
          hotel?.hotelId ||
          hotel?.property?.id;

        let image = null;

        if (hotelId) {
          image = await getHotelPhoto(hotelId);
        }

        const price = getPrice(hotel);

        return {
          hotel_id: hotelId,
          name: getHotelName(hotel),
          rating: getRating(hotel),
          image: image,
          price: price,
          raw: hotel
        };
      })
    );

    res.json({
      status: true,

      destination: {
        name: destination.name || city,
        dest_id: destId,
        search_type: searchType
      },

      dates: {
        checkin,
        checkout
      },

      guests: {
        adults,
        rooms,
        children_age: children_age || ""
      },

      hotels: finalHotels
    });

  } catch (error) {

    console.error(
      "HOTEL SEARCH ERROR:",
      error.response?.data || error.message
    );

    res.status(500).json({
      status: false,
      error: "Hotel search failed",
      details:
        error.response?.data ||
        error.message
    });
  }
});

// ----------------------------------------------------
// FRONTEND
// ----------------------------------------------------

app.get("*", (req, res) => {

  const dates = defaultDates();

  res.send(`
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>Sheet Holidays - Hotels</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    Arial,
    Helvetica,
    sans-serif;

  background: #07111f;
  color: white;
}

.header {

  background: #ffffff;

  height: 70px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 0 20px;

  position: sticky;

  top: 0;

  z-index: 100;
}

.logo {

  color: #111827;

  font-size: 20px;

  font-weight: 800;
}

.menu {

  font-size: 28px;

  color: #111827;
}

.container {

  max-width: 700px;

  margin: auto;

  padding: 15px;
}

.search {

  background: #111d30;

  border: 1px solid #26364d;

  padding: 16px;

  border-radius: 18px;

  margin-bottom: 22px;
}

label {

  font-size: 11px;

  color: #94a3b8;

  font-weight: bold;

  display: block;

  margin-bottom: 6px;
}

input,
select {

  width: 100%;

  border: 1px solid #334155;

  background: #07111f;

  color: white;

  padding: 13px;

  border-radius: 10px;

  font-size: 14px;

  outline: none;
}

.field {

  margin-bottom: 12px;
}

.row {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 10px;
}

.searchBtn {

  width: 100%;

  border: 0;

  padding: 14px;

  border-radius: 30px;

  background: #16a34a;

  color: white;

  font-size: 17px;

  font-weight: 800;

  margin-top: 5px;
}

.searchBtn:active {

  transform: scale(.98);
}

.title {

  font-size: 20px;

  font-weight: 800;

  margin: 20px 0 14px;
}

.hotel {

  background: #111d30;

  border: 1px solid #26364d;

  border-radius: 18px;

  overflow: hidden;

  margin-bottom: 20px;
}

.hotelImage {

  width: 100%;

  height: 230px;

  object-fit: cover;

  display: block;

  background: #172235;
}

.hotelBody {

  padding: 15px;
}

.hotelName {

  font-size: 19px;

  font-weight: 800;

  margin-bottom: 7px;
}

.rating {

  color: #fbbf24;

  font-size: 14px;

  margin-bottom: 8px;
}

.price {

  color: #34d399;

  font-size: 23px;

  font-weight: 900;

  margin: 10px 0;
}

.price small {

  color: #94a3b8;

  font-size: 12px;

  font-weight: normal;
}

.book {

  display: block;

  text-decoration: none;

  text-align: center;

  background: #16a34a;

  color: white;

  padding: 13px;

  border-radius: 10px;

  font-size: 16px;

  font-weight: 800;
}

.loading {

  text-align: center;

  color: #94a3b8;

  padding: 30px;
}

.error {

  background: #3f1620;

  border: 1px solid #7f1d1d;

  padding: 15px;

  border-radius: 12px;

  color: #fecaca;
}

.noImage {

  height: 230px;

  display: flex;

  align-items: center;

  justify-content: center;

  background: #172235;

  color: #64748b;

  font-size: 14px;
}

@media(max-width: 500px) {

  .container {
    padding: 10px;
  }

  .hotelImage {
    height: 210px;
  }

}

</style>

</head>

<body>

<div class="header">

  <div class="logo">
    SHEET HOLIDAYS
  </div>

  <div class="menu">
    ☰
  </div>

</div>

<div class="container">

  <div class="search">

    <div class="field">

      <label>DESTINATION</label>

      <input
        id="city"
        value="Goa"
        placeholder="Goa, Mumbai, Delhi..."
      >

    </div>

    <div class="row">

      <div class="field">

        <label>CHECK-IN</label>

        <input
          id="checkin"
          type="date"
          value="${dates.checkin}"
        >

      </div>

      <div class="field">

        <label>CHECK-OUT</label>

        <input
          id="checkout"
          type="date"
          value="${dates.checkout}"
        >

      </div>

    </div>

    <div class="row">

      <div class="field">

        <label>ADULTS</label>

        <select id="adults">

          <option value="1">1 Adult</option>

          <option value="2" selected>
            2 Adults
          </option>

          <option value="3">
            3 Adults
          </option>

          <option value="4">
            4 Adults
          </option>

          <option value="5">
            5 Adults
          </option>

          <option value="6">
            6 Adults
          </option>

        </select>

      </div>

      <div class="field">

        <label>ROOMS</label>

        <select id="rooms">

          <option value="1" selected>
            1 Room
          </option>

          <option value="2">
            2 Rooms
          </option>

          <option value="3">
            3 Rooms
          </option>

          <option value="4">
            4 Rooms
          </option>

        </select>

      </div>

    </div>

    <div class="field">

      <label>CHILDREN AGES</label>

      <input
        id="children"
        placeholder="Example: 5,10 (leave blank if none)"
      >

    </div>

    <button
      class="searchBtn"
      onclick="searchHotels()"
    >
      🔍 Search Hotels
    </button>

  </div>

  <div class="title" id="title">
    Popular Hotels
  </div>

  <div id="results">

    <div class="loading">
      Loading hotels...
    </div>

  </div>

</div>

<script>

function escapeHtml(text) {

  if (!text) return "";

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function money(price) {

  if (!price) {

    return "Price unavailable";

  }

  const amount =
    Number(price.amount || 0);

  if (!amount) {

    return "Price unavailable";

  }

  return "₹" +
    amount.toLocaleString("en-IN");

}


function createCard(hotel) {

  const name =
    escapeHtml(hotel.name || "Hotel");

  const rating =
    hotel.rating
      ? "⭐ " + hotel.rating
      : "";

  const price =
    money(hotel.price);

  const image =
    hotel.image;

  const city =
    document.getElementById("city").value;

  const checkin =
    document.getElementById("checkin").value;

  const checkout =
    document.getElementById("checkout").value;

  const adults =
    document.getElementById("adults").value;

  const rooms =
    document.getElementById("rooms").value;

  const children =
    document.getElementById("children").value;

  const message =
    "Hi Sheet Holidays!%0A%0A" +
    "I want to book:%0A" +
    name +
    "%0A%0A" +
    "Destination: " + city +
    "%0ACheck-in: " + checkin +
    "%0ACheck-out: " + checkout +
    "%0AAdults: " + adults +
    "%0ARooms: " + rooms +
    "%0AChildren: " +
    (children || "0") +
    "%0A%0A" +
    "Shown Price: " + price;

  const whatsapp =
    "https://wa.me/917388442233?text=" +
    message;

  let photoHtml = "";

  if (image) {

    photoHtml = \`
      <img
        class="hotelImage"
        src="\${image}"
        loading="lazy"
        referrerpolicy="no-referrer"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      >
      <div
        class="noImage"
        style="display:none"
      >
        Hotel photo unavailable
      </div>
    \`;

  } else {

    photoHtml = \`
      <div class="noImage">
        Hotel photo unavailable
      </div>
    \`;

  }

  return \`
    <div class="hotel">

      \${photoHtml}

      <div class="hotelBody">

        <div class="hotelName">
          \${name}
        </div>

        <div class="rating">
          \${rating}
        </div>

        <div class="price">
          \${price}
          <small>
            / selected stay
          </small>
        </div>

        <a
          class="book"
          href="\${whatsapp}"
          target="_blank"
        >
          💬 Book on WhatsApp
        </a>

      </div>

    </div>
  \`;
}


async function searchHotels() {

  const city =
    document.getElementById("city")
      .value.trim();

  const checkin =
    document.getElementById("checkin")
      .value;

  const checkout =
    document.getElementById("checkout")
      .value;

  const adults =
    document.getElementById("adults")
      .value;

  const rooms =
    document.getElementById("rooms")
      .value;

  const children =
    document.getElementById("children")
      .value.trim();

  const results =
    document.getElementById("results");

  const title =
    document.getElementById("title");

  if (!city) {

    alert("City enter karein");

    return;

  }

  if (!checkin || !checkout) {

    alert("Check-in aur Check-out select karein");

    return;

  }

  title.innerText =
    "Searching hotels in " + city + "...";

  results.innerHTML =
    \`
      <div class="loading">
        🔄 Finding live hotels, prices & photos...
      </div>
    \`;

  try {

    let url =
      "/api/hotels" +
      "?city=" + encodeURIComponent(city) +
      "&checkin=" + encodeURIComponent(checkin) +
      "&checkout=" + encodeURIComponent(checkout) +
      "&adults=" + encodeURIComponent(adults) +
      "&rooms=" + encodeURIComponent(rooms);

    if (children) {

      url +=
        "&children_age=" +
        encodeURIComponent(children);

    }

    const response =
      await fetch(url);

    const data =
      await response.json();

    if (!response.ok || !data.status) {

      throw new Error(
        data.details?.message ||
        data.error ||
        "Hotel API error"
      );

    }

    const hotels =
      data.hotels || [];

    title.innerText =
      "Hotels in " +
      (data.destination?.name || city);

    if (!hotels.length) {

      results.innerHTML =
        \`
          <div class="error">
            Is destination ke liye hotels nahi mile.
          </div>
        \`;

      return;

    }

    results.innerHTML =
      hotels.map(createCard).join("");

  } catch (error) {

    console.error(error);

    results.innerHTML =
      \`
        <div class="error">

          <b>Hotel search failed</b>

          <br><br>

          \${escapeHtml(error.message)}

        </div>
      \`;

  }

}


// Load Goa automatically
window.addEventListener(
  "load",
  searchHotels
);

</script>

</body>

</html>
  `);
});


// ----------------------------------------------------
// START
// ----------------------------------------------------

app.listen(PORT, () => {

  console.log(
    `Sheet Holidays server running on port ${PORT}`
  );

});
