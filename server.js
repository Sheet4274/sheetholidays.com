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

    // केवल यही असली और काम करने वाला एंडपॉइंट है
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

    // डेटा को निकालने के लिए सभी संभव रास्ते
    if (Array.isArray(rawData)) {
      hotelsList = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      hotelsList = rawData.data;
    } else if (rawData.hotels && Array.isArray(rawData.hotels)) {
      hotelsList = rawData.hotels;
    } else if (rawData.result && Array.isArray(rawData.result)) {
      hotelsList = rawData.result;
    } else if (rawData.properties && Array.isArray(rawData.properties)) {
      hotelsList = rawData.properties;
    } else if (rawData.data?.hotels && Array.isArray(rawData.data.hotels)) {
      hotelsList = rawData.data.hotels;
    } else if (typeof rawData === 'object' && rawData !== null) {
      for (let key in rawData) {
        if (Array.isArray(rawData[key]) && rawData[key].length > 0) {
          hotelsList = rawData[key];
          break;
        }
      }
    }

    console.log("Extracted Hotels Count:", hotelsList.length);

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
