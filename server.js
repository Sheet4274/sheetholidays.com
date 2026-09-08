const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HOST = 'agoda-com.p.rapidapi.com'; 

app.get('/', (req, res) => {
  res.send('Sheet Hotels Agoda Backend Online! 🚀');
});

app.get('/api/searchHotels', async (req, res) => {
  try {
    let { id, checkin, checkout, adults, rooms } = req.query;
    
    // Agoda API request with proper query parameters matching your curl logic
    const response = await axios.get(`https://${HOST}/hotels/search-overnight`, {
      params: {
        id: id || '1_318',
        checkIn: checkin || '2026-10-01',
        checkOut: checkout || '2026-10-05',
        adults: adults || '2',
        rooms: rooms || '1'
      },
      headers: {
        'x-rapidapi-host': HOST,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
      }
    });

    // Render logs me check karne ke liye ki Agoda kya bhej raha hai
    console.log("AGODA API RESPONSE:", JSON.stringify(response.data));

    res.json(response.data);
  } catch (error) {
    console.error("Agoda API Error:", error.response?.data || error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
