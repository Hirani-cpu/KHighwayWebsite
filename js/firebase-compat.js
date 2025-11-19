// Firebase Compatibility Layer - Maintains old API, uses Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAeMt3Ahtg6FNRGY1cUuySoxUsJdzr7Z7A",
  authDomain: "k-highway-shop.firebaseapp.com",
  projectId: "k-highway-shop",
  storageBucket: "k-highway-shop.firebasestorage.app",
  messagingSenderId: "568359321582",
  appId: "1:568359321582:web:faf2b48cb3556664b898ff"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth compatibility
window.Auth = {
  _user: null,
  _profile: null,
  _ready: false,

  async _init() {
    return new Promise(resolve => {
      onAuthStateChanged(auth, async (user) => {
        this._user = user;
        if (user) {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          this._profile = docSnap.exists() ? { ...docSnap.data(), email: user.email } : null;
        } else {
          this._profile = null;
        }
        this._ready = true;
        this.updateNavigation();
        resolve();
      });
    });
  },

  isLoggedIn() { return this._user !== null; },
  getCurrentUser() { return this._profile; },

  async signup(data) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        firstName: data.firstName, lastName: data.lastName,
        phone: data.phone || '', address: data.address || '',
        address2: data.address2 || '', city: data.city || '',
        postcode: data.postcode || '', country: data.country || 'GB',
        createdAt: new Date().toISOString()
      });
      return { success: true, message: 'Account created!' };
    } catch (e) {
      return { success: false, message: e.code === 'auth/email-already-in-use' ? 'Email already in use.' : 'Error creating account.' };
    }
  },

  async login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true, message: 'Login successful!' };
    } catch (e) {
      return { success: false, message: 'Invalid email or password.' };
    }
  },

  async logout() { await signOut(auth); },

  async updateProfile(updates) {
    if (!this._user) return { success: false, message: 'Not logged in.' };
    try {
      await updateDoc(doc(db, 'users', this._user.uid), updates);
      this._profile = { ...this._profile, ...updates };
      return { success: true, message: 'Profile updated!' };
    } catch (e) {
      return { success: false, message: 'Update failed.' };
    }
  },

  async changePassword() {
    return { success: false, message: 'Use Firebase password reset.' };
  },

  updateNavigation() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    const existing = navLinks.querySelector('.auth-link');
    if (existing) existing.remove();
    const li = document.createElement('li');
    li.className = 'auth-link';
    li.innerHTML = this.isLoggedIn() && this._profile
      ? `<a href="account.html">👤 ${this._profile.firstName}</a>`
      : `<a href="login.html">Login</a>`;
    const cart = navLinks.querySelector('.cart-link')?.parentElement;
    cart ? navLinks.insertBefore(li, cart) : navLinks.appendChild(li);
  }
};

// Reviews compatibility
window.Reviews = {
  async getProductReviews(productId) {
    try {
      const q = query(collection(db, 'reviews'), where('productId', '==', productId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  },

  async getUserReview(productId, email) {
    try {
      const q = query(collection(db, 'reviews'), where('productId', '==', productId), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) { return null; }
  },

  async addReview(data) {
    try {
      const existing = await this.getUserReview(data.productId, data.email);
      if (existing) return { success: false, message: 'Already reviewed.', existingReview: existing };
      const ref = await addDoc(collection(db, 'reviews'), {
        ...data, email: data.email.toLowerCase(), date: new Date().toISOString()
      });
      return { success: true, review: { id: ref.id, ...data } };
    } catch (e) { return { success: false, message: 'Failed to add review.' }; }
  },

  async updateReview(id, data) {
    try {
      await updateDoc(doc(db, 'reviews', id), {
        rating: data.rating, title: data.title, comment: data.comment, date: new Date().toISOString()
      });
      return { success: true };
    } catch (e) { return { success: false, message: 'Update failed.' }; }
  },

  async getAverageRating(productId) {
    const reviews = await this.getProductReviews(productId);
    if (!reviews.length) return { average: 0, count: 0 };
    const sum = reviews.reduce((a, r) => a + r.rating, 0);
    return { average: (sum / reviews.length).toFixed(1), count: reviews.length };
  },

  generateStars(rating) {
    let h = '';
    for (let i = 1; i <= 5; i++) h += `<span class="star">${i <= rating ? '★' : '☆'}</span>`;
    return h;
  },

  formatDate(d) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
};

// Orders
window.FirebaseOrders = {
  async saveOrder(data) {
    try {
      await addDoc(collection(db, 'orders'), {
        ...data, userEmail: data.userEmail.toLowerCase(), date: new Date().toISOString()
      });
      return { success: true };
    } catch (e) {
      console.error('Error saving order:', e);
      return { success: false };
    }
  },

  async getUserOrders(email) {
    try {
      const q = query(collection(db, 'orders'), where('userEmail', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (e) {
      console.error('Error getting orders:', e);
      return [];
    }
  }
};

// Cart sync with Firebase
window.FirebaseCart = {
  async saveCart(userId, cartItems) {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'carts', userId), {
        items: cartItems,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  },

  async loadCart(userId) {
    if (!userId) return null;
    try {
      const docSnap = await getDoc(doc(db, 'carts', userId));
      if (docSnap.exists()) {
        return docSnap.data().items || [];
      }
      return null;
    } catch (e) {
      console.error('Error loading cart:', e);
      return null;
    }
  },

  async clearCart(userId) {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'carts', userId), {
        items: [],
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error clearing cart:', e);
    }
  }
};

// Initialize and sync cart
Auth._init().then(async () => {
  // Sync cart from Firebase when logged in
  if (Auth.isLoggedIn() && Auth._user) {
    const firebaseCart = await FirebaseCart.loadCart(Auth._user.uid);
    if (firebaseCart && firebaseCart.length > 0) {
      const localCart = JSON.parse(localStorage.getItem('diyHardwareCart') || '[]');
      // Merge carts - Firebase takes priority, but add any local items not in Firebase
      const mergedCart = [...firebaseCart];
      localCart.forEach(localItem => {
        if (!mergedCart.find(item => item.id === localItem.id)) {
          mergedCart.push(localItem);
        }
      });
      localStorage.setItem('diyHardwareCart', JSON.stringify(mergedCart));
      // Update cart count display
      if (window.Cart) {
        Cart.updateCartCount();
      }
    }
  }
});
