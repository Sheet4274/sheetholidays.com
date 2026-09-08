require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const HOST = 'booking-com15.p.rapidapi.com';

const headers = {
  'x-rapidapi-host': HOST,
  'x-rapidapi-key': process.env.RAPIDAPI_KEY
};


/* =========================
   DESTINATION SEARCH
   ========================= */

app.get('/api/destinations', async (req, res) => {
  try {

    const query = req.query.query;

    if (!query) {
      return res.status(400).json({
        status: false,
        error: 'Please enter a destination'
      });
    }

    const response = await axios.get(
      `https://${HOST}/api/v1/hotels/searchDestination`,
      {
        params: {
          query: query,
          locale: 'en-us'
        },
        headers
      }
    );

    res.json(response.data);

  } catch (error) {

    console.error(
      'Destination Error:',
      error.response?.data || error.message
    );

    res.status(500).json({
      status: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});


/* =========================
   HOTEL SEARCH
   ========================= */

app.get('/api/hotels', async (req, res) => {

  try {

    const {
      dest_id,
      search_type,
      checkin,
      checkout,
      adults = 2,
      rooms = 1
    } = req.query;

    if (!dest_id) {
      return res.status(400).json({
        status: false,
        error: 'dest_id is required'
      });
    }

    if (!checkin || !checkout) {
      return res.status(400).json({
        status: false,
        error: 'checkin and checkout are required'
      });
    }

    const response = await axios.get(
      `https://${HOST}/api/v1/hotels/searchHotels`,
      {
        params: {
          dest_id: dest_id,
          search_type: search_type || 'city',
          arrival_date: checkin,
          departure_date: checkout,
          adults: adults,
          room_qty: rooms,
          currency_code: 'INR',
          languagecode: 'en-us',
          units: 'metric'
        },
        headers
      }
    );

    res.json(response.data);

  } catch (error) {

    console.error(
      'Hotel Search Error:',
      error.response?.data || error.message
    );

    res.status(500).json({
      status: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});


/* =========================
   FLIGHT SEARCH
   ========================= */

app.get('/api/flights', async (req, res) => {

  try {

    const {
      fromId,
      toId,
      departDate,
      returnDate,
      adults = 1,
      currency = 'INR'
    } = req.query;

    if (!fromId || !toId || !departDate) {
      return res.status(400).json({
        status: false,
        error: 'fromId, toId and departDate are required'
      });
    }

    const params = {
      fromId: fromId.includes('.AIRPORT')
        ? fromId
        : `${fromId}.AIRPORT`,

      toId: toId.includes('.AIRPORT')
        ? toId
        : `${toId}.AIRPORT`,

      departDate: departDate,

      currency_code: currency,

      adults: adults
    };

    if (returnDate) {
      params.returnDate = returnDate;
    }

    const response = await axios.get(
      `https://${HOST}/api/v1/flights/searchFlights`,
      {
        params,
        headers
      }
    );

    res.json(response.data);

  } catch (error) {

    console.error(
      'Flight Search Error:',
      error.response?.data || error.message
    );

    res.status(500).json({
      status: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});


/* =========================
   SERVER
   ========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
