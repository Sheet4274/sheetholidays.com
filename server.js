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

    // Auto Dynamic Dates: Always calculates valid future dates from TODAY
    const now = new Date();
    const checkinObj = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
    const checkoutObj = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const checkin = checkinObj.toISOString().split('T')[0];
    const checkout = checkoutObj.toISOString().split('T')[0];

    const response = await axios.get(`https://${HOST}/hotels/search-overnight`, {
      params: {
        id: destinationId,
        checkinDate: checkin,
        checkoutDate: checkout,
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
    
    // Extracting nested hotels array
    let properties = rawData?.data?.citySearch?.properties || 
                     rawData?.data?.properties || 
                     rawData?.results || 
                     rawData?.properties || 
                     [];

    // Extract structure dynamically
    const hotels = properties.map(h => {
      let img = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500';
      if (h.propertyImage?.url) img = h.propertyImage.url;
      else if (h.images?.[0]?.url) img = h.images[0].url;

      let prc = 'Check Rates';
      if (h.pricingInfo?.price?.formatted) prc = h.pricingInfo.price.formatted;
      else if (h.price?.formatted) prc = h.price.formatted;
      else if (h.price) prc = `₹${h.price}`;

      return {
        name: h.propertyCaption || h.name || h.hotelName || 'Agoda Luxury Hotel',
        image: img,
        price: prc
      };
    });

    return res.json({ success: true, count: hotels.length, hotels: hotels });

  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
