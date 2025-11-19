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

    const existingAuthLink = navLinks.querySelector('.auth-link');
    if (existingAuthLink) existingAuthLink.remove();

    const authLi = document.createElement('li');
    authLi.className = 'auth-link';

    if (this.isLoggedIn() && this.userProfile) {
      authLi.innerHTML = `<a href="account.html">👤 ${this.userProfile.firstName}</a>`;
    } else {
      authLi.innerHTML = `<a href="login.html">Login</a>`;
    }

    const cartLi = navLinks.querySelector('.cart-link')?.parentElement;
    if (cartLi) {
      navLinks.insertBefore(authLi, cartLi);
    } else {
      navLinks.appendChild(authLi);
    }
  }
};

export default FirebaseAuth;
