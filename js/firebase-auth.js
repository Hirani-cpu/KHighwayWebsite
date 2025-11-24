// Firebase Authentication System
import {
  auth, db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc, setDoc, getDoc, updateDoc
} from './firebase-config.js';

const FirebaseAuth = {
  currentUser: null,
  userProfile: null,

  // Initialize auth state listener
  init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = user;
          this.userProfile = await this.getUserProfile(user.uid);
        } else {
          this.currentUser = null;
          this.userProfile = null;
        }
        this.updateNavigation();
        resolve(user);
      });
    });
  },

  // Get user profile from Firestore
  async getUserProfile(uid) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  },

  // Check if logged in
  isLoggedIn() {
    return this.currentUser !== null;
  },

  // Get current user data
  getCurrentUser() {
    if (!this.userProfile) return null;
    return {
      ...this.userProfile,
      email: this.currentUser?.email
    };
  },

  // Sign up
  async signup(userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Save user profile to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone || '',
        address: userData.address || '',
        address2: userData.address2 || '',
        city: userData.city || '',
        postcode: userData.postcode || '',
        country: userData.country || 'GB',
        createdAt: new Date().toISOString()
      });

      return { success: true, message: 'Account created successfully!' };
    } catch (error) {
      let message = 'An error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email already in use.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password too weak.';
      }
      return { success: false, message };
    }
  },

  // Login
  async login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true, message: 'Login successful!' };
    } catch (error) {
      return { success: false, message: 'Invalid email or password.' };
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userProfile = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Update profile
  async updateProfile(updates) {
    if (!this.currentUser) {
      return { success: false, message: 'Not logged in.' };
    }

    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
      this.userProfile = { ...this.userProfile, ...updates };
      return { success: true, message: 'Profile updated!' };
    } catch (error) {
      return { success: false, message: 'Update failed.' };
    }
  },

  // Update navigation
  updateNavigation() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    // Remove any existing auth links (both static and dynamic)
    const existingAuthLinks = navLinks.querySelectorAll('.auth-nav-item');
    existingAuthLinks.forEach(link => link.remove());

    // Create new auth link
    const authLi = document.createElement('li');
    authLi.className = 'auth-nav-item';

    if (this.isLoggedIn() && this.userProfile) {
      // User is logged in - show account link or dropdown
      const firstName = this.userProfile.firstName || 'Account';
      authLi.innerHTML = `
        <div class="dropdown">
          <a href="account.html" class="auth-link">👤 ${firstName}</a>
          <div class="dropdown-menu">
            <a href="account.html">My Account</a>
            <a href="#" onclick="FirebaseAuth.logout(); window.location.href='index.html'; return false;">Logout</a>
          </div>
        </div>`;
    } else {
      // User is not logged in - show login link
      authLi.innerHTML = `<a href="login.html" class="auth-link">Login</a>`;
    }

    // Find the cart link and insert auth link before it
    const cartLink = navLinks.querySelector('a[href="cart.html"]');
    if (cartLink && cartLink.parentElement) {
      navLinks.insertBefore(authLi, cartLink.parentElement);
    } else {
      // If cart link not found, append to the end
      navLinks.appendChild(authLi);
    }
  }
};

export default FirebaseAuth;
