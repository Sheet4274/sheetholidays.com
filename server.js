const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HOST = 'agoda-com.p.rapidapi.com'; 

app.get('/', (req, res) => {
  res.send('Sheet Hotels Backend Active! 🚀');
});

app.get('/api/searchHotels', async (req, res) => {
  try {
    let { id, checkin, checkout, adults, rooms } = req.query;
    
    console.log(`Querying Agoda -> ID: ${id}, checkin: ${checkin}, checkout: ${checkout}`);

    const response = await axios.get(`https://${HOST}/hotels/search-overnight`, {
      params: {
        id: id || '1_318',
        checkinDate: checkin || '2026-09-08',
        checkoutDate: checkout || '2026-09-09',
        adults: adults || '2',
        rooms: rooms || '1',
        currency: 'INR'
      },
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': HOST,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
      }
    });

    console.log("AGODA SUCCESS! Keys:", Object.keys(response.data || {}));

    let rawData = response.data;
    let hotelsList = [];

    // logs ke mutabiq response.data ke andar 'data' key hai
    let actualData = rawData.data || rawData;

    if (Array.isArray(actualData)) {
      hotelsList = actualData;
    } else if (actualData.hotels && Array.isArray(actualData.hotels)) {
      hotelsList = actualData.hotels;
    } else if (actualData.result && Array.isArray(actualData.result)) {
      hotelsList = actualData.result;
    } else if (actualData.properties && Array.isArray(actualData.properties)) {
      hotelsList = actualData.properties;
    } else if (typeof actualData === 'object' && actualData !== null) {
      for (let key in actualData) {
        if (Array.isArray(actualData[key]) && actualData[key].length > 0) {
          hotelsList = actualData[key];
          break;
        }
      }
    }

    console.log("Final Extracted Hotels Count:", hotelsList.length);

    res.json({ 
      success: true, 
      count: hotelsList.length,
      hotels: hotelsList 
    });

  } catch (error) {
    console.error("Agoda API Error:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message,
      hotels: [] 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
