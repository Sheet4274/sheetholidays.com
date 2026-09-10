const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

const PORT = process.env.PORT || 3000;


// ============================================================
// DEFAULT DATES
// ============================================================

function getDefaultDates() {
  const today = new Date();

  const checkin = new Date(today);
  checkin.setDate(today.getDate() + 1);

  const checkout = new Date(today);
  checkout.setDate(today.getDate() + 3);

  return {
    checkin: checkin.toISOString().split("T")[0],
    checkout: checkout.toISOString().split("T")[0]
  };
}


// ============================================================
// RAPIDAPI HEADERS
// ============================================================

function getHeaders() {
  return {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST
  };
}


// ============================================================
// GET HOTEL PROPERTIES FROM DIFFERENT RESPONSE FORMATS
// ============================================================

function getProperties(data) {
  return (
    data?.searchResults?.results ||
    data?.data?.searchResults?.results ||
    data?.properties ||
    data?.data?.propertySearch?.properties ||
    data?.data?.properties ||
    data?.data?.results ||
    []
  );
}


// ============================================================
// REAL HOTEL IMAGE PARSER
// ============================================================

function parseImage(hotel) {
  const possibleImages = [
    // Hotels.com Provider - MAIN REAL IMAGE
    hotel?.optimizedThumbUrls?.srpDesktop,
    hotel?.optimizedThumbUrls?.srpMobile,
    hotel?.optimizedThumbUrls?.srpTablet,

    // Other possible formats
    hotel?.propertyImage?.image?.url,
    hotel?.propertyImage?.url,
    hotel?.propertyImage?.fallbackUrl,

    hotel?.cardPhotos?.[0]?.image?.url,
    hotel?.cardPhotos?.[0]?.url,

    hotel?.propertyImages?.[0]?.image?.url,
    hotel?.propertyImages?.[0]?.url,

    hotel?.mapMarker?.propertyImage?.url,

    hotel?.summary?.propertyImage?.image?.url,
    hotel?.summary?.propertyImage?.url
  ];

  for (let url of possibleImages) {
    if (typeof url !== "string") continue;

    url = url.trim();

    if (url.length < 10) continue;

    // Protocol-relative URL
    if (url.startsWith("//")) {
      url = "https:" + url;
    }

    // Some APIs return {size}
    url = url.replace(/\{size\}/gi, "z");

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
  }

  // No fake Unsplash image.
  return "";
}


// ============================================================
// PRICE PARSER
// ============================================================

function parsePrice(hotel) {
  try {
    const candidates = [

      // Hotels.com common pricing formats
      hotel?.price?.displayMessages?.[0]?.lineItems?.[0]?.price?.formatted,

      hotel?.price?.options?.[0]?.formattedDisplayPrice,

      hotel?.price?.options?.[0]?.formatted,

      hotel?.price?.lead?.formatted,

      hotel?.price?.formatted,

      hotel?.price?.formattedCurrent,

      hotel?.price?.currentPrice?.formatted,

      hotel?.price?.totalPrice?.formatted,

      hotel?.ratePlan?.price?.formatted,

      hotel?.ratePlan?.price?.current?.formatted,

      hotel?.pricing?.formatted,

      hotel?.pricing?.total?.formatted,

      hotel?.pricing?.totalPrice?.formatted,

      hotel?.pricing?.currentPrice?.formatted,

      hotel?.price?.displayPrice,

      hotel?.price?.current
    ];

    for (const value of candidates) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return String(value);
      }
    }

    // Numeric fallback
    const rawValues = [
      hotel?.price?.lead?.amount,
      hotel?.price?.raw?.value,
      hotel?.price?.amount,
      hotel?.pricing?.amount,
      hotel?.pricing?.total?.amount,
      hotel?.pricing?.totalPrice?.amount
    ];

    for (const raw of rawValues) {
      const num = Number(raw);

      if (Number.isFinite(num) && num > 0) {
        return "₹" + Math.round(num).toLocaleString("en-IN");
      }
    }

  } catch (e) {
    console.log("PRICE PARSE ERROR:", e.message);
  }

  return "Rates on Request";
}


// ============================================================
// CITY / REGION FINDER
// ============================================================

async function findCityRegion(city) {

  const regionRes = await axios.get(
    `https://${RAPIDAPI_HOST}/v2/regions`,
    {
      params: {
        query: city,
        locale: "en_IN",
        domain: "IN"
      },
      headers: getHeaders(),
      timeout: 30000
    }
  );

  const regions = regionRes.data?.data || [];

  if (!regions.length) {
    return null;
  }

  const cityRegion =
    regions.find(
      r =>
        r.type === "CITY" ||
        r.type === "NEIGHBORHOOD"
    ) || regions[0];

  return cityRegion.gaiaId || cityRegion.id || null;
}


// ============================================================
// HOTEL SEARCH
// ============================================================

async function searchHotelsAPI({
  gaiaId,
  checkin,
  checkout,
  adults,
  rooms
}) {

  const hotelRes = await axios.get(
    `https://${RAPIDAPI_HOST}/v3/hotels/search`,
    {
      params: {
        region_id: gaiaId,

        locale: "en_IN",
        domain: "IN",

        checkin_date: checkin,
        checkout_date: checkout,

        sort_order: "RECOMMENDED",

        adults_number: adults,
        rooms_number: rooms,

        currency: "INR",

        page_number: "1"
      },

      headers: getHeaders(),

      timeout: 45000
    }
  );

  return hotelRes.data;
}


// ============================================================
// 1. SEARCH API ENDPOINT
// ============================================================

app.get("/api/hotels", async (req, res) => {

  try {

    let {
      city,
      checkin,
      checkout,
      adults,
      rooms
    } = req.query;

    city = city || "Goa";

    const defaultDates = getDefaultDates();

    checkin = checkin || defaultDates.checkin;
    checkout = checkout || defaultDates.checkout;

    adults = adults || "2";
    rooms = rooms || "1";


    if (!RAPIDAPI_KEY) {

      return res.status(500).json({
        error: "RAPIDAPI_KEY missing on server"
      });

    }


    console.log(
      `Searching hotels: ${city} | ${checkin} -> ${checkout} | Adults: ${adults} | Rooms: ${rooms}`
    );


    // Find city
    const gaiaId = await findCityRegion(city);


    if (!gaiaId) {

      return res.status(404).json({
        error: "City region not found"
      });

    }


    console.log("GAIA ID:", gaiaId);


    // Search hotels
    const hotelData = await searchHotelsAPI({
      gaiaId,
      checkin,
      checkout,
      adults,
      rooms
    });


    const properties = getProperties(hotelData);


    console.log("TOTAL HOTELS FOUND:", properties.length);


    // Debug first hotel
    if (properties.length > 0) {

      console.log(
        "FIRST HOTEL:",
        properties[0]?.name
      );

      console.log(
        "FIRST HOTEL IMAGE:",
        parseImage(properties[0])
      );

      console.log(
        "FIRST HOTEL PRICE:",
        parsePrice(properties[0])
      );

    }


    res.json(hotelData);


  } catch (err) {

    const errData =
      err.response?.data ||
      err.message;

    console.error(
      "API SEARCH ERROR:",
      JSON.stringify(errData, null, 2)
    );


    res.status(
      err.response?.status || 500
    ).json({
      error: "API Search Failed",
      details: errData
    });

  }

});


// ============================================================
// 2. FEATURED HOTELS
// ============================================================

app.get("/api/featured-hotels", async (req, res) => {

  try {

    if (!RAPIDAPI_KEY) {

      return res.status(500).json({
        error: "RAPIDAPI_KEY missing on server"
      });

    }


    const defaultDates = getDefaultDates();

    const cities = [
      "Goa",
      "Mumbai",
      "Delhi",
      "Jaipur"
    ];

    let allHotels = [];


    for (const city of cities) {

      if (allHotels.length >= 20) {
        break;
      }


      try {

        console.log(
          "Loading featured city:",
          city
        );


        const gaiaId =
          await findCityRegion(city);


        if (!gaiaId) {
          console.log(
            "No region found:",
            city
          );
          continue;
        }


        const hotelData =
          await searchHotelsAPI({

            gaiaId,

            checkin:
              defaultDates.checkin,

            checkout:
              defaultDates.checkout,

            adults: "2",

            rooms: "1"

          });


        const props =
          getProperties(hotelData);


        console.log(
          `${city}: ${props.length} hotels`
        );


        const taggedProps =
          props.map(hotel => ({

            ...hotel,

            cityName: city

          }));


        allHotels =
          allHotels.concat(taggedProps);


      } catch (e) {

        console.log(
          `Skipped ${city}:`,
          e.response?.data ||
          e.message
        );

      }

    }


    const finalHotels =
      allHotels.slice(0, 20);


    console.log(
      "TOTAL FEATURED:",
      finalHotels.length
    );


    res.json({
      properties: finalHotels
    });


  } catch (err) {

    console.error(
      "FEATURED ERROR:",
      err.message
    );


    res.status(500).json({
      error:
        "Failed to fetch featured hotels"
    });

  }

});


// ============================================================
// 3. FRONTEND
// ============================================================

app.get("*", (req, res) => {

  const dates = getDefaultDates();


  res.send(`

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
Sheet Holidays - Book Best Hotels & Resorts Online
</title>

<meta
  name="description"
  content="Book Hotels, Resorts and Budget Stays with Sheet Holidays."
>

<style>

* {
  box-sizing: border-box;
}

body {

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;

  background: #0f172a;

  margin: 0;

  padding: 0;

  color: #f8fafc;

}


/* NAVBAR */

.navbar {

  background: #1e293b;

  padding: 15px 20px;

  display: flex;

  justify-content: space-between;

  align-items: center;

  border-bottom:
    1px solid #334155;

}

.logo {

  font-size: 20px;

  font-weight: 800;

  color: #38bdf8;

  text-decoration: none;

}


/* CONTAINER */

.container {

  max-width: 600px;

  margin: 15px auto;

  padding: 0 12px;

}


/* OFFER */

.promo-banner {

  background:
    linear-gradient(
      135deg,
      #f59e0b,
      #d97706
    );

  color: #000;

  padding: 12px 15px;

  border-radius: 12px;

  margin-bottom: 15px;

  font-weight: bold;

  text-align: center;

  font-size: 14px;

}

.promo-code {

  background: #000;

  color: #fff;

  padding: 2px 8px;

  border-radius: 4px;

  font-size: 12px;

}


/* SEARCH */

.search-card {

  background: #1e293b;

  border-radius: 16px;

  padding: 16px;

  border:
    1px solid #334155;

  box-shadow:
    0 10px 25px
    rgba(0,0,0,0.5);

}


.input-group {

  background: #0f172a;

  border:
    1px solid #334155;

  border-radius: 10px;

  padding: 8px 12px;

  margin-bottom: 10px;

}


.input-group label {

  font-size: 10px;

  font-weight: 800;

  color: #94a3b8;

  display: block;

  text-transform: uppercase;

}


.input-group input,
.input-group select {

  border: none;

  background: transparent;

  font-size: 14px;

  width: 100%;

  outline: none;

  font-weight: 600;

  color: #fff;

}


.form-row {

  display: flex;

  gap: 8px;

}


.form-row .input-group {

  flex: 1;

}


/* BUTTON */

.search-btn {

  background: #2563eb;

  color: white;

  border: none;

  width: 100%;

  padding: 14px;

  border-radius: 25px;

  font-size: 16px;

  font-weight: bold;

  cursor: pointer;

}


.search-btn:hover {

  background: #1d4ed8;

}


/* TITLE */

.section-title {

  font-size: 18px;

  font-weight: 700;

  margin:
    25px 0 12px 0;

  color: #38bdf8;

}


/* HOTEL */

.hotel-card {

  background: #1e293b;

  border-radius: 14px;

  overflow: hidden;

  margin-bottom: 16px;

  border:
    1px solid #334155;

}


.hotel-img {

  width: 100%;

  height: 210px;

  object-fit: cover;

  background: #334155;

  display: block;

}


.no-image {

  width: 100%;

  height: 210px;

  background:
    linear-gradient(
      135deg,
      #1e293b,
      #334155
    );

  display: flex;

  align-items: center;

  justify-content: center;

  color: #94a3b8;

  font-size: 45px;

}


.hotel-body {

  padding: 14px;

}


.hotel-name {

  font-size: 17px;

  font-weight: 700;

  color: #ffffff;

  margin:
    0 0 6px 0;

}


.location-badge {

  font-size: 12px;

  color: #94a3b8;

  margin-bottom: 8px;

}


.hotel-price {

  font-size: 20px;

  font-weight: 800;

  color: #34d399;

  margin: 6px 0;

}


/* WHATSAPP */

.wa-btn {

  background: #22c55e;

  color: white;

  display: block;

  text-align: center;

  padding: 11px;

  border-radius: 8px;

  text-decoration: none;

  font-weight: bold;

  margin-top: 10px;

  font-size: 15px;

}


.wa-btn:hover {

  background: #16a34a;

}


/* MOBILE */

@media(max-width: 480px) {

  .container {
    padding: 0 10px;
  }

  .hotel-img,
  .no-image {
    height: 200px;
  }

}

</style>

</head>


<body>


<div class="navbar">

  <a href="/" class="logo">
    🏨 Sheet Holidays
  </a>

</div>


<div class="container">


<div class="promo-banner">

🔥 SPECIAL OFFER:
Get Flat 15% OFF!

Use Code:

<span class="promo-code">
SHEET10
</span>

</div>


<!-- SEARCH CARD -->

<div class="search-card">


<div class="input-group">

<label>
Where To?
</label>

<input
  type="text"
  id="cityInput"
  value="Goa"
  placeholder="Enter City (e.g. Goa, Mumbai)"
>

</div>


<div class="form-row">


<div class="input-group">

<label>
Check-In
</label>

<input
  type="date"
  id="checkinInput"
  value="${dates.checkin}"
>

</div>


<div class="input-group">

<label>
Check-Out
</label>

<input
  type="date"
  id="checkoutInput"
  value="${dates.checkout}"
>

</div>


</div>


<div class="form-row">


<div class="input-group">

<label>
Guests
</label>

<select id="adultsInput">

<option value="1">
1 Adult
</option>

<option value="2" selected>
2 Adults
</option>

<option value="3">
3 Adults
</option>

<option value="4">
4 Adults
</option>

</select>

</div>


<div class="input-group">

<label>
Rooms
</label>

<select id="roomsInput">

<option value="1" selected>
1 Room
</option>

<option value="2">
2 Rooms
</option>

<option value="3">
3 Rooms
</option>

</select>

</div>


</div>


<button
  class="search-btn"
  onclick="searchHotels()"
>

Search Hotels

</button>


</div>


<div class="section-title">

<span id="listTitle">
Top Featured Stays (20 Mix Destinations)
</span>

</div>


<div id="results">

<p
  style="
    text-align:center;
    color:#94a3b8;
  "
>

Loading 20 Featured Hotels...

</p>

</div>


</div>


<script>


// ============================================================
// PRICE PARSER
// ============================================================

function parsePrice(hotel) {

  try {

    const candidates = [

      hotel?.price?.displayMessages?.[0]
        ?.lineItems?.[0]
        ?.price?.formatted,

      hotel?.price?.options?.[0]
        ?.formattedDisplayPrice,

      hotel?.price?.options?.[0]
        ?.formatted,

      hotel?.price?.lead?.formatted,

      hotel?.price?.formatted,

      hotel?.price?.formattedCurrent,

      hotel?.price?.currentPrice?.formatted,

      hotel?.price?.totalPrice?.formatted,

      hotel?.ratePlan?.price?.formatted,

      hotel?.ratePlan?.price?.current?.formatted,

      hotel?.pricing?.formatted,

      hotel?.pricing?.total?.formatted,

      hotel?.pricing?.totalPrice?.formatted,

      hotel?.pricing?.currentPrice?.formatted

    ];


    for (const value of candidates) {

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {

        return String(value);

      }

    }


    const rawValues = [

      hotel?.price?.lead?.amount,

      hotel?.price?.raw?.value,

      hotel?.price?.amount,

      hotel?.pricing?.amount,

      hotel?.pricing?.total?.amount,

      hotel?.pricing?.totalPrice?.amount

    ];


    for (const raw of rawValues) {

      const num = Number(raw);

      if (
        Number.isFinite(num) &&
        num > 0
      ) {

        return "₹" +
          Math.round(num)
            .toLocaleString("en-IN");

      }

    }


  } catch(e) {

    console.log(
      "PRICE ERROR:",
      e.message
    );

  }


  return "Rates on Request";

}


// ============================================================
// IMAGE PARSER
// ============================================================

function parseImage(hotel) {

  const images = [

    // REAL HOTELS.COM IMAGE
    hotel?.optimizedThumbUrls?.srpDesktop,

    hotel?.optimizedThumbUrls?.srpMobile,

    hotel?.optimizedThumbUrls?.srpTablet,

    hotel?.propertyImage?.image?.url,

    hotel?.propertyImage?.url,

    hotel?.propertyImage?.fallbackUrl,

    hotel?.cardPhotos?.[0]?.image?.url,

    hotel?.cardPhotos?.[0]?.url,

    hotel?.propertyImages?.[0]?.image?.url,

    hotel?.propertyImages?.[0]?.url,

    hotel?.mapMarker?.propertyImage?.url,

    hotel?.summary?.propertyImage?.image?.url,

    hotel?.summary?.propertyImage?.url

  ];


  for (let url of images) {

    if (typeof url !== "string") {
      continue;
    }


    url = url.trim();


    if (url.length < 10) {
      continue;
    }


    if (url.startsWith("//")) {
      url = "https:" + url;
    }


    url =
      url.replace(
        /\{size\}/gi,
        "z"
      );


    if (
      url.startsWith("https://") ||
      url.startsWith("http://")
    ) {

      return url;

    }

  }


  return "";

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ============================================================
// BUILD HOTEL CARDS
// ============================================================

function buildHotelCards(
  properties,
  defaultCity = ""
) {

  let html = "";


  properties.forEach(hotel => {

    const name =
      escapeHtml(
        hotel.name ||
        "Luxury Stay"
      );


    const price =
      escapeHtml(
        parsePrice(hotel)
      );


    const img =
      parseImage(hotel);


    const city =
      escapeHtml(
        hotel.cityName ||
        defaultCity ||
        "India"
      );


    const checkin =
      document.getElementById(
        "checkinInput"
      ).value;


    const checkout =
      document.getElementById(
        "checkoutInput"
      ).value;


    const guests =
      document.getElementById(
        "adultsInput"
      ).value;


    const rooms =
      document.getElementById(
        "roomsInput"
      ).value;


    const cleanName =
      hotel.name ||
      "Hotel";


    const message =
      "Hi Sheet Holidays! " +
      "I want to book " +
      cleanName +
      " in " +
      city +
      ". Dates: " +
      checkin +
      " to " +
      checkout +
      " (" +
      guests +
      " Guests, " +
      rooms +
      " Room). Price: " +
      parsePrice(hotel);


    const msg =
      encodeURIComponent(
        message
      );


    const waLink =
      "https://wa.me/917388442233?text=" +
      msg;


    let imageHTML = "";


    if (img) {

      imageHTML = `

        <img
          src="${img}"
          class="hotel-img"
          alt="${name}"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="
            this.onerror=null;
            this.outerHTML='<div class=&quot;no-image&quot;>🏨</div>';
          "
        >

      `;

    } else {

      imageHTML = `

        <div class="no-image">
          🏨
        </div>

      `;

    }


    html += `

      <div class="hotel-card">

        ${imageHTML}

        <div class="hotel-body">

          <div class="hotel-name">
            ${name}
          </div>

          <div class="location-badge">
            📍 ${city}
          </div>

          <div class="hotel-price">
            ${price}
          </div>

          <a
            href="${waLink}"
            target="_blank"
            rel="noopener"
            class="wa-btn"
          >
            Book on WhatsApp
          </a>

        </div>

      </div>

    `;

  });


  return html;

}


// ============================================================
// LOAD FEATURED HOTELS
// ============================================================

async function loadFeaturedHotels() {

  const resultsDiv =
    document.getElementById(
      "results"
    );


  try {

    const res =
      await fetch(
        "/api/featured-hotels"
      );


    const data =
      await res.json();


    const properties =
      data.properties || [];


    if (
      properties.length > 0
    ) {

      resultsDiv.innerHTML =
        buildHotelCards(
          properties
        );

    } else {

      searchHotels();

    }


  } catch(e) {

    console.log(
      "Featured error:",
      e
    );

    searchHotels();

  }

}


// ============================================================
// SEARCH HOTELS
// ============================================================

async function searchHotels() {

  const city =
    document.getElementById(
      "cityInput"
    ).value.trim();


  const checkin =
    document.getElementById(
      "checkinInput"
    ).value;


  const checkout =
    document.getElementById(
      "checkoutInput"
    ).value;


  const adults =
    document.getElementById(
      "adultsInput"
    ).value;


  const rooms =
    document.getElementById(
      "roomsInput"
    ).value;


  const resultsDiv =
    document.getElementById(
      "results"
    );


  const listTitle =
    document.getElementById(
      "listTitle"
    );


  if (!city) {

    alert(
      "City Name Enter Karein!"
    );

    return;

  }


  listTitle.innerText =
    "Available Hotels in " +
    city;


  resultsDiv.innerHTML = `

    <p
      style="
        text-align:center;
        color:#94a3b8;
      "
    >
      Searching live hotels and rates...
    </p>

  `;


  try {

    const url =
      "/api/hotels" +
      "?city=" +
      encodeURIComponent(city) +
      "&checkin=" +
      encodeURIComponent(checkin) +
      "&checkout=" +
      encodeURIComponent(checkout) +
      "&adults=" +
      encodeURIComponent(adults) +
      "&rooms=" +
      encodeURIComponent(rooms);


    const res =
      await fetch(url);


    const data =
      await res.json();


    if (!res.ok || data.error) {

      resultsDiv.innerHTML = `

        <p
          style="
            color:#f43f5e;
            text-align:center;
          "
        >
          ${escapeHtml(
            data.error ||
            "Hotel search failed"
          )}

        </p>

      `;

      return;

    }


    const properties =

      data?.searchResults?.results ||

      data?.data?.searchResults?.results ||

      data?.properties ||

      data?.data?.propertySearch?.properties ||

      data?.data?.properties ||

      data?.data?.results ||

      [];


    if (
      !properties ||
      properties.length === 0
    ) {

      resultsDiv.innerHTML = `

        <p
          style="
            text-align:center;
            color:#94a3b8;
          "
        >
          No hotels found in
          ${escapeHtml(city)}.
          Try another location.
        </p>

      `;

      return;

    }


    resultsDiv.innerHTML =
      buildHotelCards(
        properties.slice(0, 20),
        city
      );


  } catch(err) {

    console.log(
      "Search frontend error:",
      err
    );


    resultsDiv.innerHTML = `

      <p
        style="
          color:#f43f5e;
          text-align:center;
        "
      >
        Search Request Failed.
        Please try again.
      </p>

    `;

  }

}


// ============================================================
// START
// ============================================================

window.onload =
  loadFeaturedHotels;

</script>


</body>

</html>

  `);

});


// ============================================================
// SERVER
// ============================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `RapidAPI Host: ${RAPIDAPI_HOST}`
    );

  }
);
