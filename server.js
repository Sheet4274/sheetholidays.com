const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Agoda RapidAPI Host
const HOST = 'agoda-com.p.rapidapi.com'; 

const getHeaders = () => ({
  'x-rapidapi-host': HOST,
  'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
});

app.get('/', (req, res) => {
  res.send('Sheet Hotels (Agoda Powered) Backend is Online! 🚀');
});

// Agoda Hotel Search Route
app.get('/api/searchHotels', async (req, res) => {
  try {
    let { id } = req.query; // Jaise tera example tha id=1_318 ya city ID
    
    const response = await axios.get(`https://${HOST}/hotels/search-overnight`, {
      params: {
        id: id || '1_318' // Default id agar kuch na mile
      },
      headers: getHeaders()
    });

    res.json(response.data);
  } catch (error) {
    console.error("Agoda API Error Details:", error.response?.data || error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
