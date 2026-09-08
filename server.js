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

// 1. HOTEL / DESTINATION SEARCH
app.get('/api/destinations', async (req, res) => {
  try {
    const query = req.query.query || 'Delhi';
    const response = await axios.get(`https://${HOST}/api/v1/hotels/searchDestination`, {
      params: { query, locale: 'en-us' },
      headers
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

// 2. FLIGHT SEARCH (Auto format Airport Code)
app.get('/api/flights', async (req, res) => {
  try {
    let { fromId, toId, departDate } = req.query;
    if (!fromId || !toId || !departDate) {
      return res.status(400).json({ status: false, error: 'From, To and Date are required' });
    }

    // Auto append .AIRPORT if missing
    fromId = fromId.toUpperCase().includes('.AIRPORT') ? fromId.toUpperCase() : `${fromId.toUpperCase()}.AIRPORT`;
    toId = toId.toUpperCase().includes('.AIRPORT') ? toId.toUpperCase() : `${toId.toUpperCase()}.AIRPORT`;

    const response = await axios.get(`https://${HOST}/api/v1/flights/searchFlights`, {
      params: {
        fromId,
        toId,
        departDate,
        currency_code: 'INR',
        adults: 1
      },
      headers
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ status: false, error: error.response?.data?.message || error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
