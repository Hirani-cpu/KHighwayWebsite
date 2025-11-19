// Authentication System for DIY Hardware Shop

const Auth = {
  // Storage keys
  USERS_KEY: 'diyHardwareUsers',
  CURRENT_USER_KEY: 'diyHardwareCurrentUser',

  // Get all users
  getUsers() {
    return JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
  },

  // Save users
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  // Get current logged in user
  getCurrentUser() {
    const email = localStorage.getItem(this.CURRENT_USER_KEY);
    if (!email) return null;

    const users = this.getUsers();
    return users.find(u => u.email === email) || null;
  },

  // Check if user is logged in
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  // Sign up new user
  signup(userData) {
    const users = this.getUsers();

    // Check if email already exists
    if (users.find(u => u.email === userData.email)) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email: userData.email,
      password: userData.password, // In production, this should be hashed
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone || '',
      address: userData.address || '',
      address2: userData.address2 || '',
      city: userData.city || '',
      postcode: userData.postcode || '',
      country: userData.country || 'GB',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    // Auto login after signup
    localStorage.setItem(this.CURRENT_USER_KEY, newUser.email);

    return { success: true, message: 'Account created successfully!' };
  },

  // Login user
  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return { success: false, message: 'Invalid email or password.' };
    }

    localStorage.setItem(this.CURRENT_USER_KEY, user.email);
    return { success: true, message: 'Login successful!' };
  },

  // Logout user
  logout() {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  },

  // Update user profile
  updateProfile(updates) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Not logged in.' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.email === currentUser.email);

    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }

    // Update user data
    users[userIndex] = {
      ...users[userIndex],
      firstName: updates.firstName || users[userIndex].firstName,
      lastName: updates.lastName || users[userIndex].lastName,
      phone: updates.phone || users[userIndex].phone,
      address: updates.address || users[userIndex].address,
      address2: updates.address2 || users[userIndex].address2,
      city: updates.city || users[userIndex].city,
      postcode: updates.postcode || users[userIndex].postcode,
      country: updates.country || users[userIndex].country
    };

    this.saveUsers(users);
    return { success: true, message: 'Profile updated successfully!' };
  },

  // Change password
  changePassword(currentPassword, newPassword) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Not logged in.' };
    }

    if (currentUser.password !== currentPassword) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    users[userIndex].password = newPassword;
    this.saveUsers(users);

    return { success: true, message: 'Password changed successfully!' };
  },

  // Get user's orders
  getUserOrders() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];

    const allOrders = JSON.parse(localStorage.getItem('diyHardwareOrders') || '[]');
    // Filter orders by user email (we'll update checkout to save user email with orders)
    return allOrders.filter(order => order.userEmail === currentUser.email);
  },

  // Update navigation based on auth state
  updateNavigation() {
    const cartLinks = document.querySelectorAll('.cart-link');
    const navLinks = document.getElementById('navLinks');

    if (!navLinks) return;

    // Remove existing auth links
    const existingAuthLink = navLinks.querySelector('.auth-link');
    if (existingAuthLink) {
      existingAuthLink.remove();
    }

    // Create new auth link
    const authLi = document.createElement('li');
    authLi.className = 'auth-link';

    if (this.isLoggedIn()) {
      const user = this.getCurrentUser();
      authLi.innerHTML = `<a href="account.html">👤 ${user.firstName}</a>`;
    } else {
      authLi.innerHTML = `<a href="login.html">Login</a>`;
    }

    // Insert before cart link
    const cartLi = navLinks.querySelector('.cart-link')?.parentElement;
    if (cartLi) {
      navLinks.insertBefore(authLi, cartLi);
    } else {
      navLinks.appendChild(authLi);
    }
  }
};

// Update navigation on page load
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateNavigation();
});
