const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "hotels-com-provider.p.rapidapi.com";

// DEBUG ENDPOINT - Direct API Response dekhne ke liye
app.get('/api/debug', async (req, res) => {
  try {
    const city = req.query.city || "Mumbai";
    
    // 1. Check Key
    if (!RAPIDAPI_KEY) {
      return res.json({ status: "ERROR", message: "RAPIDAPI_KEY variable Render par nahi mil raha" });
    }

    // 2. Fetch Region RAW
    const regionRes = await axios.get(`https://${RAPIDAPI_HOST}/v2/regions`, {
      params: { query: city, locale: 'en_IN', domain: 'IN' },
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });

    res.json({
      status: "SUCCESS",
      regions_found: regionRes.data?.data?.length || 0,
      raw_region_data: regionRes.data
    });

  } catch (err) {
    res.json({
      status: "API_FAILED",
      error_message: err.message,
      rapidapi_response: err.response ? err.response.data : "No response from RapidAPI"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
