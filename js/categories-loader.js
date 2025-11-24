// Categories Loader - Loads categories from Firestore
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAeMt3Ahtg6FNRGY1cUuySoxUsJdzr7Z7A",
  authDomain: "k-highway-shop.firebaseapp.com",
  projectId: "k-highway-shop",
  storageBucket: "k-highway-shop.firebasestorage.app",
  messagingSenderId: "568359321582",
  appId: "1:568359321582:web:faf2b48cb3556664b898ff"
};

// Initialize Firebase - use existing app if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
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

  getCategoryIcon(slug, icon) {
    if (icon) return icon;
    const lowerSlug = (slug || '').toLowerCase();
    for (const [key, iconEmoji] of Object.entries(this.categoryIcons)) {
      if (lowerSlug.includes(key)) {
        return iconEmoji;
      }
    }
    return this.categoryIcons.default;
  },

  async init() {
    console.log('CategoriesLoader: Initializing...');
    try {
      await this.loadCategories();
      await this.loadFooterCategories();
    } catch (error) {
      console.error('CategoriesLoader init error:', error);
    }
  },

  async loadCategories() {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('category.html')) {
      await this.loadCategoryPage();
    } else if (pathname.includes('index.html') || pathname.endsWith('/') || pathname === '') {
      await this.loadHomepageCategories();
    }
  },

  async loadHomepageCategories() {
    console.log('Loading homepage categories...');
    const container = document.querySelector('#categoriesGrid');
    if (!container) {
      console.log('Homepage categories container #categoriesGrid not found');
      return;
    }

    try {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">Loading categories...</div>';

      const snapshot = await getDocs(collection(db, 'categories'));
      console.log('Categories from Firestore:', snapshot.size);

      if (snapshot.empty) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">No categories available. Add categories from admin panel.</div>';
        return;
      }

      // Get categories and sort by order
      const categories = [];
      snapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
      });
      categories.sort((a, b) => (a.order || 999) - (b.order || 999));

      container.innerHTML = '';
      categories.forEach(category => {
        container.innerHTML += this.createCategoryCard(category);
      });

      console.log('Homepage categories loaded:', categories.length);
    } catch (error) {
      console.error('Error loading homepage categories:', error);
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red;">Error: ${error.message}</div>`;
    }
  },

  async loadCategoryPage() {
    console.log('Loading category page...');
    const container = document.querySelector('.categories-grid');
    if (!container) {
      console.log('Category page container .categories-grid not found');
      return;
    }

    try {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">Loading categories...</div>';

      const snapshot = await getDocs(collection(db, 'categories'));
      console.log('Categories from Firestore:', snapshot.size);

      if (snapshot.empty) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">No categories available. Add categories from admin panel.</div>';
        return;
      }

      const categories = [];
      snapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
      });
      categories.sort((a, b) => (a.order || 999) - (b.order || 999));

      container.innerHTML = '';
      categories.forEach(category => {
        container.innerHTML += this.createDetailedCategoryCard(category);
      });

      console.log('Category page loaded:', categories.length);
    } catch (error) {
      console.error('Error loading category page:', error);
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red;">Error: ${error.message}</div>`;
    }
  },

  async loadFooterCategories() {
    const container = document.querySelector('#footerCategories');
    if (!container) return;

    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      if (snapshot.empty) return;

      const categories = [];
      snapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
      });
      categories.sort((a, b) => (a.order || 999) - (b.order || 999));

      container.innerHTML = '';
      categories.slice(0, 4).forEach(category => {
        const slug = category.slug || category.id;
        container.innerHTML += `<li><a href="products.html#${slug}">${category.name}</a></li>`;
      });
    } catch (error) {
      console.error('Error loading footer categories:', error);
    }
  },

  createCategoryCard(category) {
    const slug = category.slug || category.id;
    const icon = this.getCategoryIcon(slug, category.icon);
    return `
      <a href="products.html#${slug}" class="category-card">
        <div class="category-icon">${icon}</div>
        <div class="category-name">${category.name}</div>
      </a>
    `;
  },

  createDetailedCategoryCard(category) {
    const slug = category.slug || category.id;
    const icon = this.getCategoryIcon(slug, category.icon);
    const description = category.description || `Browse our ${category.name.toLowerCase()} collection`;
    return `
      <a href="products.html#${slug}" class="category-card reveal">
        <div class="category-icon">${icon}</div>
        <h3 class="category-name">${category.name}</h3>
        <p class="category-desc">${description}</p>
        <span class="category-link">Browse Products →</span>
      </a>
    `;
  }
};

export default CategoriesLoader;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CategoriesLoader.init());
} else {
  CategoriesLoader.init();
}