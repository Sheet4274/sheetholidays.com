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

// City Name to City ID
async function resolveLocation(city) {
  if (!city) return '14706';
  const cityMap = {
    goa: '4153', mumbai: '15560', delhi: '14706',
    bangalore: '16538', hyderabad: '8803', chennai: '17270',
    srinagar: '318', jaipur: '8260', kolkata: '16281'
  };

  const cityKey = city.toLowerCase().trim();
  if (cityMap[cityKey]) return cityMap[cityKey];

  try {
    const response = await axios.get(`https://${HOST}/hotels/auto-complete`, {
      params: { text: city, language: 'en-us' },
      headers: { 'x-rapidapi-host': HOST, 'x-rapidapi-key': API_KEY },
      timeout: 10000
    });
    const locations = response.data?.data || response.data?.results || [];
    if (locations.length > 0) {
      return locations[0].id || locations[0].cityId || '14706';
    }
  } catch (error) {
    console.error('Location error:', error.message);
  }
  return '14706';
}

app.get('/api/searchHotels', async (req, res) => {
  try {
    const city = req.query.city || 'delhi';
    const destinationId = await resolveLocation(city);

    // Dynamic Dates (आज से 30 दिन बाद की तारीख)
    const today = new Date();
    const checkin = new Date(today.setDate(today.getDate() + 30)).toISOString().split('T')[0];
    const checkout = new Date(today.setDate(today.getDate() + 3)).toISOString().split('T')[0];

    const response = await axios.get(`https://${HOST}/hotels/search-overnight`, {
      params: {
        id: destinationId,
        checkinDate: checkin,
        checkoutDate: checkout,
        adults: '2',
        rooms: '1',
        currency: 'INR'
      },
      headers: {
        'x-rapidapi-host': HOST,
        'x-rapidapi-key': API_KEY
      },
      timeout: 25000
    });

    const rawData = response.data;
    
    // Exact Agoda Response Parsing
    let properties = [];
    if (rawData?.data?.citySearch?.properties) {
      properties = rawData.data.citySearch.properties;
    } else if (rawData?.results) {
      properties = rawData.results;
    } else if (rawData?.properties) {
      properties = rawData.properties;
    }

    const hotels = properties.map(h => ({
      name: h.propertyCaption || h.name || 'Agoda Listed Hotel',
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
