const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Booking.com Map Properties List Route
app.get('/api/booking/cities', async (req, res) => {
    try {
        const response = await fetch('https://apidojo-booking-v1.p.rapidapi.com/properties/list-by-map?room_qty=1&guest_qty=1&bbox=14.291283%2C14.948423%2C120.755688%2C121.136864&search_id=none&children_age=11%2C5&price_filter_currencycode=USD&categories_filter=class%3A%3A1%2Cclass%3A%3A2%2Cclass%3A%3A3&languagecode=en-us&travel_purpose=leisure&children_qty=2&order_by=popularity&offset=0', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'apidojo-booking-v1.p.rapidapi.com',
                'x-rapidapi-key': '54b0132b50msh88120a0c3aec79ep1cfcefjsn69cc3e68ee1f'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.send('Server Active');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
