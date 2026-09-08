const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.json());

const HOST = 'agoda-com.p.rapidapi.com';
const API_KEY = process.env.RAPIDAPI_KEY;

app.get('/', (req, res) => res.send('Backend Online'));

const CITY_IDS = {
  goa: '4153',
  mumbai: '15560',
  delhi: '14706',
  bangalore: '16538',
  hyderabad: '8803',
  chennai: '17270',
  srinagar: '318',
  jaipur: '8260'
};

app.get('/api/searchHotels', async (req, res) => {
  try {
    const cityInput = (req.query.city || 'delhi').toLowerCase().trim();
    const destinationId = CITY_IDS[cityInput] || '14706';

    // Dates matching Agoda's exact query format
    const checkInDate = '2026-10-01';
    const checkOutDate = '2026-10-05';

    const response = await axios.get(`https://${HOST}/hotels/search-overnight`, {
      params: {
        id: destinationId,
        checkIn: checkInDate,     // Correct parameter name (CamelCase)
        checkOut: checkOutDate,   // Correct parameter name (CamelCase)
        adults: '2',
        rooms: '1',
        currency: 'INR',
        language: 'en-us'
      },
      headers: {
        'x-rapidapi-host': HOST,
        'x-rapidapi-key': API_KEY
      },
      timeout: 25000
    });

    const rawData = response.data;
    
    let properties = rawData?.data?.citySearch?.properties || 
                     rawData?.data?.properties || 
                     rawData?.results || 
                     rawData?.properties || 
                     [];

    const hotels = properties.map(h => ({
      name: h.propertyCaption || h.name || h.hotelName || 'Agoda Listed Hotel',
      image: h.propertyImage?.url || h.images?.[0]?.url || 'https://via.placeholder.com/400x200?text=Hotel+Image',
      price: h.pricingInfo?.price?.formatted || (h.price ? `₹${h.price}` : 'Check Rates')
    }));

    return res.json({ success: true, count: hotels.length, hotels: hotels });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
