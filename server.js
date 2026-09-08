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
        checkinDate: checkin || '2026-10-01',
        checkoutDate: checkout || '2026-10-05',
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

    let rawData = response.data;
    let hotelsList = [];

    // डीप सर्च लॉजिक: रिस्पॉन्स के अंदर किसी भी स्तर पर एरे (Array) ढूंढने के लिए
    function findArrayInObject(obj) {
      if (!obj || typeof obj !== 'object') return null;
      for (let key in obj) {
        if (Array.isArray(obj[key]) && obj[key].length > 0) {
          // चेक करते हैं कि क्या इस एरे के अंदर होटल जैसी चीज़ें हैं
          return obj[key];
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          let found = findArrayInObject(obj[key]);
          if (found) return found;
        }
      }
      return null;
    }

    if (Array.isArray(rawData)) {
      hotelsList = rawData;
    } else {
      hotelsList = findArrayInObject(rawData) || [];
    }

    console.log("Deep Searched Hotels Count:", hotelsList.length);

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
