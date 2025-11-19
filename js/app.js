// Main App - Initialize Firebase Services
import FirebaseAuth from './firebase-auth.js';
import FirebaseReviews from './firebase-reviews.js';
import FirebaseOrders from './firebase-orders.js';

// Make available globally
window.FirebaseAuth = FirebaseAuth;
window.FirebaseReviews = FirebaseReviews;
window.FirebaseOrders = FirebaseOrders;

// Initialize auth
FirebaseAuth.init().then(() => {
  // Dispatch event when ready
  window.dispatchEvent(new Event('firebase-ready'));
});
