const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HOST = 'agoda-com.p.rapidapi.com'; 

app.get('/', (req, res) => {
  res.send('Sheet Hotels Agoda Direct API Online! 🚀');
});

app.get('/api/searchHotels', async (req, res) => {
  try {
    let { id } = req.query;
    
    // Exact match to your curl parameters
    const response = await axios.get(`https://${HOST}/hotels/search-overnight`, {
      params: {
        id: id || '1_318'
      },
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': HOST,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
      }
    });

    console.log("AGODA RAW RESPONSE:", JSON.stringify(response.data));

    let rawData = response.data;
    let hotelsList = [];

    // Safe extraction matching Agoda's exact JSON tree
    if (Array.isArray(rawData)) {
      hotelsList = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      hotelsList = rawData.data;
    } else if (rawData.hotels && Array.isArray(rawData.hotels)) {
      hotelsList = rawData.hotels;
    } else if (rawData.result && Array.isArray(rawData.result)) {
      hotelsList = rawData.result;
    } else if (typeof rawData === 'object' && rawData !== null) {
      // Find any array inside the object if structure varies
      for (let key in rawData) {
        if (Array.isArray(rawData[key]) && rawData[key].length > 0) {
          hotelsList = rawData[key];
          break;
        }
      }
    }

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
