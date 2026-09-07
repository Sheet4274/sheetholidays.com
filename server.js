const fetch = require('node-fetch');
// Booking.com Nearby Cities Route
app.get('/api/booking/cities', async (req, res) => {
    const lat = req.query.lat || '65.9667';
    const lng = req.query.lng || '-18.5333';
    
    try {
        const response = await fetch(`https://booking-com15.p.rapidapi.com/api/v1/hotels/getNearbyCities?latitude=${lat}&longitude=${lng}&languagecode=en-us`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'booking-com15.p.rapidapi.com',
                'x-rapidapi-key': '54b0132b50msh88120a0c3aec79ep1cfcefjsn69cc3e68ee1f'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Booking API Fetch Error' });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
