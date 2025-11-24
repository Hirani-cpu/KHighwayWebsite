// Categories Loader - Loads categories from Firestore
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase config - must match firebase-compat.js
const firebaseConfig = {
  apiKey: "AIzaSyAeMt3Ahtg6FNRGY1cUuySoxUsJdzr7Z7A",
  authDomain: "k-highway-shop.firebaseapp.com",
  projectId: "k-highway-shop",
  storageBucket: "k-highway-shop.firebasestorage.app",
  messagingSenderId: "568359321582",
  appId: "1:568359321582:web:faf2b48cb3556664b898ff"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Categories Loader object
const CategoriesLoader = {
  // Default category icons mapping
  categoryIcons: {
    'window': '🪟',
    'door': '🚪',
    'letter': '📬',
    'trickle': '🌬️',
    'vent': '🌬️',
    'lock': '🔐',
    'cylinder': '🔐',
    'bolt': '🔩',
    'hinge': '🔧',
    'handle': '🚪',
    'accessories': '🔨',
    'tool': '🛠️',
    'hardware': '🔧',
    'security': '🔒',
    'default': '📦'
  },

  // Get icon for category
  getCategoryIcon(slug, icon) {
    // If icon is provided, use it
    if (icon) return icon;

    // Try to find matching icon based on slug/name
    const lowerSlug = (slug || '').toLowerCase();

    for (const [key, iconEmoji] of Object.entries(this.categoryIcons)) {
      if (lowerSlug.includes(key)) {
        return iconEmoji;
      }
    }

    return this.categoryIcons.default;
  },

  // Initialize and load categories
  async init() {
    console.log('CategoriesLoader: Initializing...');

    // Load categories immediately
    await this.loadCategories();

    // Also load footer categories if needed
    await this.loadFooterCategories();
  },

  // Main load function
  async loadCategories() {
    // Determine which page we're on and load accordingly
    const pathname = window.location.pathname.toLowerCase();

    if (pathname.includes('category.html')) {
      await this.loadCategoryPage();
    } else if (pathname.includes('index.html') || pathname.endsWith('/')) {
      await this.loadHomepageCategories();
    }
  },

  // Load categories for homepage
  async loadHomepageCategories() {
    console.log('Loading homepage categories...');

    const container = document.querySelector('#categoriesGrid');
    if (!container) {
      console.log('Homepage categories container not found');
      return;
    }

    try {
      // Show loading state
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">Loading categories...</div>';

      // Fetch categories from Firestore
      const categoriesQuery = query(
        collection(db, 'categories'),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(categoriesQuery);
      console.log('Categories loaded from Firestore:', snapshot.size);

      if (snapshot.empty) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">No categories available. Please add categories from the admin panel.</div>';
        return;
      }

      // Clear container
      container.innerHTML = '';

      // Add each category
      snapshot.forEach(doc => {
        const category = { id: doc.id, ...doc.data() };
        const categoryCard = this.createCategoryCard(category);
        container.innerHTML += categoryCard;
      });

      console.log('Homepage categories loaded successfully');

    } catch (error) {
      console.error('Error loading homepage categories:', error);
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red;">Error loading categories: ${error.message}</div>`;
    }
  },

  // Load categories for category page
  async loadCategoryPage() {
    console.log('Loading category page...');

    const container = document.querySelector('.categories-grid');
    if (!container) {
      console.log('Category page container not found');
      return;
    }

    try {
      // Show loading state
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">Loading categories...</div>';

      // Fetch categories from Firestore
      const categoriesQuery = query(
        collection(db, 'categories'),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(categoriesQuery);
      console.log('Categories loaded from Firestore:', snapshot.size);

      if (snapshot.empty) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">No categories available. Please add categories from the admin panel.</div>';
        return;
      }

      // Clear container
      container.innerHTML = '';

      // Add each category with description
      snapshot.forEach(doc => {
        const category = { id: doc.id, ...doc.data() };
        const categoryCard = this.createDetailedCategoryCard(category);
        container.innerHTML += categoryCard;
      });

      console.log('Category page loaded successfully');

    } catch (error) {
      console.error('Error loading category page:', error);
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red;">Error loading categories: ${error.message}</div>`;
    }
  },

  // Load categories for footer
  async loadFooterCategories() {
    console.log('Loading footer categories...');

    const container = document.querySelector('#footerCategories');
    if (!container) {
      console.log('Footer categories container not found');
      return;
    }

    try {
      // Fetch categories from Firestore (limit to 4 for footer)
      const categoriesQuery = query(
        collection(db, 'categories'),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(categoriesQuery);

      if (!snapshot.empty) {
        container.innerHTML = '';
        let count = 0;

        snapshot.forEach(doc => {
          if (count < 4) {
            const category = doc.data();
            const slug = category.slug || doc.id;
            const link = `products.html#${slug}`;
            container.innerHTML += `<li><a href="${link}">${category.name}</a></li>`;
            count++;
          }
        });
      }

      console.log('Footer categories loaded successfully');

    } catch (error) {
      console.error('Error loading footer categories:', error);
    }
  },

  // Create category card for homepage
  createCategoryCard(category) {
    const slug = category.slug || category.id;
    const icon = this.getCategoryIcon(slug, category.icon);
    const link = `products.html#${slug}`;

    return `
      <a href="${link}" class="category-card">
        <div class="category-icon">${icon}</div>
        <div class="category-name">${category.name}</div>
      </a>
    `;
  },

  // Create detailed category card for category page
  createDetailedCategoryCard(category) {
    const slug = category.slug || category.id;
    const icon = this.getCategoryIcon(slug, category.icon);
    const link = `products.html#${slug}`;
    const description = category.description || `Browse our ${category.name.toLowerCase()} collection`;

    return `
      <a href="${link}" class="category-card reveal">
        <div class="category-icon">${icon}</div>
        <h3 class="category-name">${category.name}</h3>
        <p class="category-desc">${description}</p>
        <span class="category-link">Browse Products →</span>
      </a>
    `;
  }
};

// Export for use in other modules
export default CategoriesLoader;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CategoriesLoader.init();
  });
} else {
  // DOM is already ready
  CategoriesLoader.init();
}