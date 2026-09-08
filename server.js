const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const HOST = 'agoda-com.p.rapidapi.com';
const API_KEY = process.env.RAPIDAPI_KEY;

app.get('/', (req, res) => {
  res.send('Sheet Holidays Backend Active! 🚀');
});


// ================================
// LOCATION SEARCH
// ================================

async function resolveLocation(city) {
  if (!city) {
    return null;
  }

  const value = String(city).trim();

  // If Agoda ID is directly supplied
  if (/^\d+$/.test(value) || /^\d+_\d+$/.test(value)) {
    return value;
  }

  // Popular city IDs
  const cityMap = {
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
    pune: '16858',
    ahmedabad: '16999',
    rishikesh: '1404',
    manali: '1720',
    dubai: '18731'
  };

  const cityKey = value.toLowerCase();

  if (cityMap[cityKey]) {
    console.log('Mapped city:', value, '=>', cityMap[cityKey]);
    return cityMap[cityKey];
  }

  // Agoda autocomplete
  try {
    const response = await axios.get(
      `https://${HOST}/hotels/auto-complete`,
      {
        params: {
          text: value,
          language: 'en-us'
        },
        headers: {
          'x-rapidapi-host': HOST,
          'x-rapidapi-key': API_KEY
        },
        timeout: 20000
      }
    );

    console.log(
      'Autocomplete response:',
      JSON.stringify(response.data).substring(0, 5000)
    );

    const data = response.data;

    const locations =
      data?.data ||
      data?.results ||
      data?.locations ||
      [];

    if (Array.isArray(locations) && locations.length > 0) {
      const first = locations[0];

      const id =
        first.id ||
        first.cityId ||
        first.destinationId ||
        first.entityId ||
        first.locationId;

      if (id) {
        console.log('Resolved:', value, '=>', id);
        return id;
      }
    }

  } catch (error) {
    console.error(
      'Location search error:',
      error.response?.data || error.message
    );
  }

  return null;
}


// ================================
// HOTEL SEARCH
// ================================

app.get('/api/searchHotels', async (req, res) => {

  try {

    const city = req.query.city || req.query.id;

    const checkin =
      req.query.checkin || '2026-10-01';

    const checkout =
      req.query.checkout || '2026-10-05';

    const adults =
      req.query.adults || '2';

    const rooms =
      req.query.rooms || '1';


    // Check API key

    if (!API_KEY) {

      return res.status(500).json({
        success: false,
        error: 'RAPIDAPI_KEY is missing in Render',
        hotels: []
      });

    }


    // Check city

    if (!city) {

      return res.status(400).json({
        success: false,
        error: 'City is required',
        hotels: []
      });

    }


    console.log('==============================');
    console.log('HOTEL SEARCH');
    console.log('City:', city);
    console.log('Check-in:', checkin);
    console.log('Check-out:', checkout);
    console.log('Adults:', adults);
    console.log('Rooms:', rooms);
    console.log('==============================');


    // Resolve city to Agoda ID

    const destinationId =
      await resolveLocation(city);


    if (!destinationId) {

      return res.status(404).json({
        success: false,
        error: `Location not found: ${city}`,
        hotels: []
      });

    }


    console.log(
      'Agoda destination ID:',
      destinationId
    );


    // Search hotels

    const response = await axios.get(
      `https://${HOST}/hotels/search-overnight`,
      {
        params: {
          id: destinationId,
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
      'Agoda response:',
      JSON.stringify(response.data).substring(0, 10000)
    );


    // Return Agoda response directly for now

    return res.json({
      success: true,
      destinationId: destinationId,
      data: response.data
    });


  } catch (error) {

    console.error(
      '=============================='
    );

    console.error(
      'AGODA ERROR:',
      error.response?.status
    );

    console.error(
      JSON.stringify(
        error.response?.data || error.message
      )
    );

    console.error(
      '=============================='
    );


    return res.status(
      error.response?.status || 500
    ).json({

      success: false,

      error:
        error.response?.data ||
        error.message,

      hotels: []

    });

  }

});


// ================================
// START SERVER
// ================================

const PORT =
  process.env.PORT || 10000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
