document.addEventListener('DOMContentLoaded', function() {
    // Load restaurants on restaurants page
    if (document.getElementById('restaurants-container')) {
      loadRestaurants();
    }
    
    // Initialize booking page
    if (document.getElementById('booking-form')) {
      initBookingPage();
    }
    
    // Load booking confirmation
    if (document.getElementById('booking-details')) {
      loadBookingConfirmation();
    }
});

// Load all restaurants
function loadRestaurants() {
    fetch('/api/restaurants')
      .then(response => response.json())
      .then(restaurants => {
        const container = document.getElementById('restaurants-container');
        container.innerHTML = '';
        
        if (restaurants.length === 0) {
          container.innerHTML = '<div class="col-12 text-center"><p>No restaurants found.</p></div>';
          return;
        }
        
        restaurants.forEach(restaurant => {
          const col = document.createElement('div');
          col.className = 'col-md-6 col-lg-4 mb-4';
          
          col.innerHTML = `
            <div class="card restaurant-card h-100">
              <div class="card-body">
                <h5 class="card-title">${restaurant.name}</h5>
                <p class="card-text text-muted">${restaurant.cuisine} Cuisine</p>
                <p class="card-text">Tables: ${restaurant.tables}</p>
                <p class="card-text">Hours: ${restaurant.opening_time} - ${restaurant.closing_time}</p>
                <a href="/booking.html?id=${restaurant.id}" class="btn btn-primary">Book Table</a>
              </div>
            </div>
          `;
          
          container.appendChild(col);
        });
      })
      .catch(error => {
        console.error('Error loading restaurants:', error);
        document.getElementById('restaurants-container').innerHTML = `
          <div class="col-12 text-center">
            <div class="alert alert-danger">Failed to load restaurants. Please try again later.</div>
          </div>
        `;
      });
}

// Initialize booking page
function initBookingPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get('id');
    
    if (!restaurantId) {
      window.location.href = '/restaurants.html';
      return;
    }
    
    document.getElementById('restaurant-id').value = restaurantId;
    
    // Load restaurant details
    fetch(`/api/restaurants/${restaurantId}`)
      .then(response => response.json())
      .then(restaurant => {
        const restaurantInfo = document.getElementById('restaurant-info');
        restaurantInfo.innerHTML = `
          <h3>${restaurant.name}</h3>
          <p class="text-muted">${restaurant.cuisine} Cuisine</p>
        `;
        
        // Generate time slots based on restaurant hours
        generateTimeSlots(restaurant.opening_time, restaurant.closing_time);
        
        // Load menu items
        loadMenuItems(restaurantId);
      })
      .catch(error => {
        console.error('Error loading restaurant:', error);
        window.location.href = '/restaurants.html';
      });
    
    // Initialize date picker
    flatpickr("#booking-date", {
      minDate: "today",
      dateFormat: "Y-m-d",
      disable: [
        function(date) {
          // Disable dates in the past
          return date < new Date().fp_incr(-1);
        }
      ]
    });
    
    // Check availability button
    document.getElementById('check-availability').addEventListener('click', checkAvailability);
    
    // Confirm booking button
    document.getElementById('confirm-booking').addEventListener('click', confirmBooking);
}

// Generate time slots dropdown
function generateTimeSlots(openingTime, closingTime) {
    const timeSelect = document.getElementById('booking-time');
    timeSelect.innerHTML = '';
    
    const [openHour, openMinute] = openingTime.split(':').map(Number);
    const [closeHour, closeMinute] = closingTime.split(':').map(Number);
    
    let currentHour = openHour;
    let currentMinute = openMinute;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      const option = document.createElement('option');
      option.value = timeString;
      option.textContent = timeString;
      timeSelect.appendChild(option);
      
      // Increment by 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }
}

// Load menu items for the restaurant
function loadMenuItems(restaurantId) {
    fetch(`/api/restaurants/${restaurantId}`)
      .then(response => response.json())
      .then(data => {
        const menuContainer = document.getElementById('menu-items-container');
        
        if (!data.menu || data.menu.length === 0) {
          menuContainer.innerHTML = '<div class="alert alert-info">No menu items available for pre-ordering.</div>';
          return;
        }
        
        // Group by category
        const categories = {};
        data.menu.forEach(item => {
          if (!categories[item.category]) {
            categories[item.category] = [];
          }
          categories[item.category].push(item);
        });
        
        menuContainer.innerHTML = '';
        
        for (const [category, items] of Object.entries(categories)) {
          const categoryHeader = document.createElement('h5');
          categoryHeader.className = 'category-header';
          categoryHeader.textContent = category;
          menuContainer.appendChild(categoryHeader);
          
          items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'menu-item-card';
            itemCard.innerHTML = `
              <div class="menu-item-header">
                <div>
                  <div class="menu-item-name">${item.name}</div>
                  <div class="menu-item-desc">${item.description}</div>
                </div>
                <div class="menu-item-price">$${item.price.toFixed(2)}</div>
              </div>
              
              <div class="quantity-controls">
                <button class="quantity-btn decrement" data-id="${item.id}">-</button>
                <input type="number" class="quantity-input" 
                       data-id="${item.id}" value="0" min="0" max="10">
                <button class="quantity-btn increment" data-id="${item.id}">+</button>
              </div>
              
              <div class="special-requests">
                <input type="text" class="special-requests-input" 
                       data-id="${item.id}" placeholder="Any modifications?">
              </div>
            `;
            
            menuContainer.appendChild(itemCard);
          });
        }
        
        // Add proper event listeners
        document.querySelectorAll('.increment').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const itemId = this.getAttribute('data-id');
            const input = document.querySelector(`.quantity-input[data-id="${itemId}"]`);
            input.value = parseInt(input.value) + 1;
          });
        });
        
        document.querySelectorAll('.decrement').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const itemId = this.getAttribute('data-id');
            const input = document.querySelector(`.quantity-input[data-id="${itemId}"]`);
            if (input.value > 0) {
              input.value = parseInt(input.value) - 1;
            }
          });
        });
        
        // Prevent any unwanted form submissions
        document.querySelectorAll('.quantity-input, .special-requests-input').forEach(el => {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
          });
          
          el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          });
        });
      })
      .catch(error => {
        console.error('Error loading menu:', error);
        document.getElementById('menu-items-container').innerHTML = `
          <div class="alert alert-warning">Failed to load menu items. You can still book a table.</div>
        `;
      });
}

// Check table availability
function checkAvailability() {
    const restaurantId = document.getElementById('restaurant-id').value;
    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;
    const guests = document.getElementById('guests').value;
    
    if (!date || !time || !guests) {
      alert('Please fill in all required fields');
      return;
    }
    
    fetch('/api/check-availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId,
        date,
        time,
        guests
      })
    })
    .then(response => response.json())
    .then(data => {
      const availabilityResult = document.getElementById('availability-result');
      const message = document.getElementById('availability-message');
      
      if (data.available) {
        message.innerHTML = `Table available for ${guests} guests at ${time} on ${date}.`;
        message.className = 'alert alert-success';
      } else {
        message.innerHTML = `No tables available for ${guests} guests at ${time} on ${date}. Please try a different time.`;
        message.className = 'alert alert-danger';
      }
      
      availabilityResult.style.display = 'block';
      
      if (data.available) {
        document.getElementById('confirm-booking').disabled = false;
      } else {
        document.getElementById('confirm-booking').disabled = true;
      }
    })
    .catch(error => {
      console.error('Error checking availability:', error);
      alert('Failed to check availability. Please try again.');
    });
}

// Confirm booking
function confirmBooking() {
    const restaurantId = document.getElementById('restaurant-id').value;
    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;
    const guests = document.getElementById('guests').value;
    const userName = document.getElementById('user-name').value;
    const userEmail = document.getElementById('user-email').value;
    const specialRequests = document.getElementById('special-requests').value;
    
    // Collect order items
    const orderItems = [];
    document.querySelectorAll('.quantity-input').forEach(input => {
      const quantity = parseInt(input.value);
      if (quantity > 0) {
        const itemId = input.getAttribute('data-id');
        const specialRequests = document.querySelector(`.special-requests-input[data-id="${itemId}"]`).value;
        
        orderItems.push({
          menuItemId: itemId,
          quantity: quantity,
          specialRequests: specialRequests
        });
      }
    });
    
    fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId,
        userName,
        userEmail,
        bookingDate: date,
        bookingTime: time,
        guests,
        specialRequests,
        orderItems
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.location.href = `/confirmation.html?id=${data.bookingId}`;
      } else {
        alert('Failed to create booking. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    });
}

// Load booking confirmation details
function loadBookingConfirmation() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');
    
    if (!bookingId) {
      window.location.href = '/';
      return;
    }
    
    fetch(`/api/bookings/${bookingId}`)
      .then(response => response.json())
      .then(booking => {
        const bookingDetails = document.getElementById('booking-details');
        
        let orderItemsHtml = '';
        let totalAmount = 0;
        
        if (booking.orderItems && booking.orderItems.length > 0) {
          orderItemsHtml = `
            <h4 class="mt-4">Your Order</h4>
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          booking.orderItems.forEach(item => {
            const itemTotal = item.quantity * item.item_price;
            totalAmount += itemTotal;
            
            orderItemsHtml += `
              <tr>
                <td>${item.item_name}</td>
                <td>${item.quantity}</td>
                <td>$${item.item_price.toFixed(2)}</td>
                <td>$${itemTotal.toFixed(2)}</td>
              </tr>
            `;
          });
          
          orderItemsHtml += `
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="3">Total</th>
                  <th>$${totalAmount.toFixed(2)}</th>
                </tr>
              </tfoot>
            </table>
          `;
        }
        
        bookingDetails.innerHTML = `
          <div class="card mb-4">
            <div class="card-body">
              <h4 class="card-title">Booking Details</h4>
              <p><strong>Restaurant:</strong> ${booking.restaurant_name}</p>
              <p><strong>Date:</strong> ${booking.booking_date}</p>
              <p><strong>Time:</strong> ${booking.booking_time}</p>
              <p><strong>Guests:</strong> ${booking.guests}</p>
              ${booking.special_requests ? `<p><strong>Special Requests:</strong> ${booking.special_requests}</p>` : ''}
            </div>
          </div>
          
          ${orderItemsHtml}
          
          <div class="alert alert-info mt-4">
            <h5>Booking Reference: #${booking.id}</h5>
            <p class="mb-0">Please present this reference at the restaurant.</p>
          </div>
        `;
      })
      .catch(error => {
        console.error('Error loading booking:', error);
        document.getElementById('booking-details').innerHTML = `
          <div class="alert alert-danger">Failed to load booking details.</div>
        `;
      });
}