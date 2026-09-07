const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Free Alternative API Route
app.get('/api/booking/cities', async (req, res) => {
    try {
        const response = await fetch('https://booking-com.p.rapidapi.com/v1/hotels/locations?name=Paris&locale=en-gb', {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'booking-com.p.rapidapi.com',
                'x-rapidapi-key': '54b0132b50msh88120a0c3aec79ep1cfcefjsn69cc3e68ee1f'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.get('/', (req, res) => {
    res.send('Server Active');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
