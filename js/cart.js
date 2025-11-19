// Cart System - Handles all cart operations
const Cart = {
  // Get cart from localStorage
  getCart: function() {
    const cart = localStorage.getItem('diyHardwareCart');
    return cart ? JSON.parse(cart) : [];
  },

  // Save cart to localStorage and Firebase
  saveCart: function(cart) {
    localStorage.setItem('diyHardwareCart', JSON.stringify(cart));
    this.updateCartCount();
    // Sync to Firebase if logged in
    if (window.Auth && window.Auth._user && window.FirebaseCart) {
      FirebaseCart.saveCart(Auth._user.uid, cart);
    }
  },

  // Add item to cart
  addItem: function(product) {
    const cart = this.getCart();
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += product.quantity || 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: product.quantity || 1
      });
    }

    this.saveCart(cart);
    this.showNotification(`${product.name} added to cart!`);
    return true;
  },

  // Remove item from cart
  removeItem: function(productId) {
    let cart = this.getCart();
    cart = cart.filter(item => item.id !== productId);
    this.saveCart(cart);
  },

  // Update item quantity
  updateQuantity: function(productId, quantity) {
    const cart = this.getCart();
    const item = cart.find(item => item.id === productId);

    if (item) {
      if (quantity <= 0) {
        this.removeItem(productId);
      } else {
        item.quantity = quantity;
        this.saveCart(cart);
      }
    }
  },

  // Get cart total
  getTotal: function() {
    const cart = this.getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  // Get cart item count
  getItemCount: function() {
    const cart = this.getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
  },

  // Clear cart
  clearCart: function() {
    localStorage.removeItem('diyHardwareCart');
    this.updateCartCount();
    // Clear in Firebase if logged in
    if (window.Auth && window.Auth._user && window.FirebaseCart) {
      FirebaseCart.clearCart(Auth._user.uid);
    }
  },

  // Update cart count in navbar
  updateCartCount: function() {
    const count = this.getItemCount();
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  // Show notification
  showNotification: function(message) {
    // Remove existing notification
    const existing = document.querySelector('.cart-notification');
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
      <span>✓</span> ${message}
      <a href="cart.html">View Cart</a>
    `;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  // Generate unique product ID from name
  generateId: function(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }
};

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', function() {
  Cart.updateCartCount();
});

// CSS for notification (injected)
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  .cart-notification {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: #10b981;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 3000;
    opacity: 0;
    transition: all 0.3s ease;
  }
  .cart-notification.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
  .cart-notification span {
    font-weight: bold;
  }
  .cart-notification a {
    background: white;
    color: #10b981;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    font-weight: 600;
    font-size: 0.85rem;
  }
  .cart-notification a:hover {
    background: #f0fdf4;
  }
  .cart-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .cart-count {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #f59e0b;
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: none;
    align-items: center;
    justify-content: center;
  }
`;
document.head.appendChild(notificationStyles);
