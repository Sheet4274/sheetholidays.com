require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const HOST = 'agoda-com.p.rapidapi.com';
const API_KEY = process.env.RAPIDAPI_KEY;

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sheet Hotels Backend Active 🚀'
  });
});

// ===============================
// LOCATION ID RESOLVER
// ===============================
async function resolveLocationId(query) {
  if (!query) {
    return '1_318';
  }

  query = String(query).trim();

  // Already an Agoda ID
  if (/^\d+_\d+$/.test(query) || /^\d+$/.test(query)) {
    return query;
  }

  // Popular cities
  const popularMap = {
    goa: '4153',
    mumbai: '15560',
    delhi: '14706',
    'new delhi': '14706',
    bangalore: '16538',
    bengaluru: '16538',
    hyderabad: '8803',
    chennai: '17270',
    kolkata: '1627',
    jaipur: '11304',
    agra: '15312',
    lucknow: '1_318',
    varanasi: '17136',
    dubai: '18731',
    pune: '16858',
    ahmedabad: '16999',
    rishikesh: '1404',
    manali: '1720'
  };

  const key = query.toLowerCase();

  if (popularMap[key]) {
    console.log(`Using mapped Agoda ID: ${popularMap[key]}`);
    return popularMap[key];
  }

  // Try Agoda destination search
  try {
    const result = await axios.get(
      `https://${HOST}/api/v1/destinations/search`,
      {
        params: {
          query: query,
          language: 'en-us'
        },
        headers: {
          'x-rapidapi-host': HOST,
          'x-rapidapi-key': API_KEY
        },
        timeout: 15000
      }
    );

    console.log(
      'Destination API response:',
      JSON.stringify(result.data, null, 2).slice(0, 5000)
    );

    const data = result.data?.data || result.data;

    if (Array.isArray(data) && data.length > 0) {
      const destination = data[0];

      const id =
        destination.id ||
        destination.entityId ||
        destination.destinationId ||
        destination.cityId;

      if (id) {
        console.log(`Resolved "${query}" -> ${id}`);
        return id;
      }
    }
  } catch (error) {
    console.log(
      'Destination search failed:',
      error.response?.data || error.message
    );
  }

  return null;
}

// ===============================
// HOTEL SEARCH
// ===============================
app.get('/api/searchHotels', async (req, res) => {
  try {
    const {
      id,
      checkin,
      checkout,
      adults = '2',
      rooms = '1'
    } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'City or Agoda destination ID is required',
        hotels: []
      });
    }

    if (!checkin || !checkout) {
      return res.status(400).json({
        success: false,
        error: 'checkin and checkout are required',
        hotels: []
      });
    }

    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'RAPIDAPI_KEY is missing on Render',
        hotels: []
      });
    }

    const resolvedId = await resolveLocationId(id);

    if (!resolvedId) {
      return res.status(404).json({
        success: false,
        error: `Could not find Agoda destination for "${id}"`,
        hotels: []
      });
    }

    console.log('==============================');
    console.log('HOTEL SEARCH');
    console.log('Input:', id);
    console.log('Resolved ID:', resolvedId);
    console.log('Check-in:', checkin);
    console.log('Check-out:', checkout);
    console.log('Adults:', adults);
    console.log('Rooms:', rooms);
    console.log('==============================');

    const response = await axios.get(
      `https://${HOST}/hotels/search-overnight`,
      {
        params: {
          id: resolvedId,
          checkinDate: checkin,
          checkoutDate: checkout,
          adults: adults,
          rooms: rooms,
          currency: 'INR'
        },
        headers: {
          'x-rapidapi-host': HOST,
          'x-rapidapi-key': API_KEY
        },
        timeout: 30000
      }
    );

    console.log(
      'AGODA RAW RESPONSE:',
      JSON.stringify(response.data, null, 2).slice(0, 10000)
    );

    const raw = response.data;

    // ---------------------------------
    // Find hotel-like arrays only
    // ---------------------------------
    function findHotels(obj) {
      if (!obj || typeof obj !== 'object') {
        return [];
      }

      if (Array.isArray(obj)) {
        const hotelObjects = obj.filter(item => {
          if (!item || typeof item !== 'object') return false;

          const text = JSON.stringify(item).toLowerCase();

          return (
            text.includes('"hotelname"') ||
            text.includes('"hotel_name"') ||
            text.includes('"hotelid"') ||
            text.includes('"hotel_id"') ||
            text.includes('"propertyname"') ||
            text.includes('"property_name"')
          );
        });

        if (hotelObjects.length > 0) {
          return hotelObjects;
        }

        return [];
      }

      for (const key of Object.keys(obj)) {
        const found = findHotels(obj[key]);

        if (found.length > 0) {
          return found;
        }
      }

      return [];
    }

    const hotels = findHotels(raw);

    console.log('FINAL HOTEL COUNT:', hotels.length);

    if (hotels.length === 0) {
      return res.json({
        success: false,
        count: 0,
        error: 'No hotels found in Agoda response',
        hotels: [],
        rawResponse: raw
      });
    }

    return res.json({
      success: true,
      count: hotels.length,
      hotels: hotels
    });

  } catch (error) {
    console.error(
      'AGODA ERROR:',
      error.response?.status,
      error.response?.data || error.message
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message,
      hotels: []
    });
  }
});

// ===============================
// SERVER
// ===============================
const
