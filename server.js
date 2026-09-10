// Real Image Extractor with Resolution Fix
function parseImage(hotel) {
  try {
    // RapidAPI v3 Response Tree Locations
    let imgUrl = hotel.propertyImage?.image?.url || 
                 hotel.propertyImage?.url || 
                 hotel.summary?.propertyImage?.image?.url ||
                 hotel.mapMarker?.propertyImage?.url || "";

    if (imgUrl) {
      // 1. {size} placeholder ko 'z' (High-Resolution 500x500) se replace karo
      imgUrl = imgUrl.replace('{size}', 'z');

      // 2. Agar URL '//media.hotels...' se start ho raha hai toh 'https:' lagao
      if (imgUrl.startsWith('//')) {
        imgUrl = 'https:' + imgUrl;
      }
      return imgUrl;
    }
  } catch(e) {
    console.error("Image parsing error:", e);
  }
  
  // Dynamic Unsplash Hotel Backup (Agar API me image missing ho)
  return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
}

// Cards Render Function with High-Res Image Tag
function buildHotelCards(properties, defaultCity = "") {
  let html = "";
  properties.forEach(hotel => {
    const name = hotel.name || "Luxury Stay";
    const price = parsePrice(hotel);
    const img = parseImage(hotel);
    const city = hotel.cityName || defaultCity || "India";

    const checkin = document.getElementById('checkinInput').value;
    const checkout = document.getElementById('checkoutInput').value;
    const guests = document.getElementById('adultsInput').value;
    const rooms = document.getElementById('roomsInput').value;

    const msg = encodeURIComponent("Hi Sheet Holidays! I want to book " + name + " in " + city + ". Dates: " + checkin + " to " + checkout + " (" + guests + " Guests, " + rooms + " Room). Price: " + price);
    const waLink = "https://wa.me/917388442233?text=" + msg;

    html += `
      <div class="hotel-card">
        <img src="${img}" class="hotel-img" alt="${name}" loading="lazy" crossorigin="anonymous">
        <div class="hotel-body">
          <div class="hotel-name">${name}</div>
          <div class="location-badge">📍 ${city}</div>
          <div class="hotel-price">${price}</div>
          <a href="${waLink}" target="_blank" class="wa-btn">Book on WhatsApp</a>
        </div>
      </div>
    `;
  });
  return html;
}
