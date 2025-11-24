// Load categories dynamically from Firebase
import { db, collection, getDocs, orderBy, query } from './firebase-config.js';

const CategoriesLoader = {
  // Default category icons mapping
  categoryIcons: {
    'window-handles': '🪟',
    'door-handles': '🚪',
    'letter-boxes': '📬',
    'trickle-vents': '🌬️',
    'lock-cylinders': '🔐',
    'bolts': '🔩',
    'hinges': '🔧',
    'locks': '🔒',
    'handles': '🚪',
    'accessories': '🔨',
    'tools': '🛠️',
    'default': '📦'
  },

  // Get icon for category
  getCategoryIcon(slug) {
    // Try exact match first
    if (this.categoryIcons[slug]) {
      return this.categoryIcons[slug];
    }

    // Try to find partial match
    for (const [key, icon] of Object.entries(this.categoryIcons)) {
      if (slug.includes(key) || key.includes(slug)) {
        return icon;
      }
    }

    return this.categoryIcons.default;
  },

  // Load categories for homepage
  async loadHomepageCategories() {
    const container = document.querySelector('#categories .categories-grid');
    if (!container) return;

    try {
      // Show loading state
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">Loading categories...</div>';

      // Fetch categories from Firestore
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // If no categories in database, show default categories
        this.showDefaultCategories(container);
        return;
      }

      // Clear container
      container.innerHTML = '';

      // Add each category
      snapshot.forEach(doc => {
        const category = doc.data();
        const categoryCard = this.createCategoryCard(doc.id, category);
        container.innerHTML += categoryCard;
      });

    } catch (error) {
      console.error('Error loading categories:', error);
      // Show default categories as fallback
      this.showDefaultCategories(container);
    }
  },

  // Create category card HTML
  createCategoryCard(id, category) {
    const slug = category.slug || id;
    const icon = category.icon || this.getCategoryIcon(slug);
    const link = category.link || `products.html#${slug}`;

    return `
      <a href="${link}" class="category-card">
        <div class="category-icon">${icon}</div>
        <div class="category-name">${category.name}</div>
      </a>
    `;
  },

  // Show default categories as fallback
  showDefaultCategories(container) {
    const defaultCategories = [
      { id: 'window-handles', name: 'Window Handles', icon: '🪟' },
      { id: 'door-handles', name: 'Door Handles', icon: '🚪' },
      { id: 'letter-boxes', name: 'Letter Boxes', icon: '📬' },
      { id: 'trickle-vents', name: 'Trickle Vents', icon: '🌬️' },
      { id: 'lock-cylinders', name: 'Lock Cylinders', icon: '🔐' },
      { id: 'bolts', name: 'Bolts', icon: '🔩' }
    ];

    container.innerHTML = '';
    defaultCategories.forEach(cat => {
      container.innerHTML += this.createCategoryCard(cat.id, cat);
    });
  },

  // Load categories for category page
  async loadCategoryPage() {
    const container = document.querySelector('.categories-grid');
    if (!container || !window.location.pathname.includes('category.html')) return;

    try {
      // Show loading state
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">Loading categories...</div>';

      // Fetch categories from Firestore
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        this.showDefaultCategoriesPage(container);
        return;
      }

      // Clear container
      container.innerHTML = '';

      // Add each category with description
      snapshot.forEach(doc => {
        const category = doc.data();
        const categoryCard = this.createDetailedCategoryCard(doc.id, category);
        container.innerHTML += categoryCard;
      });

    } catch (error) {
      console.error('Error loading categories:', error);
      this.showDefaultCategoriesPage(container);
    }
  },

  // Create detailed category card for category page
  createDetailedCategoryCard(id, category) {
    const slug = category.slug || id;
    const icon = category.icon || this.getCategoryIcon(slug);
    const link = category.link || `products.html#${slug}`;
    const description = category.description || `Browse our ${category.name.toLowerCase()} collection`;

    return `
      <a href="${link}" class="category-card reveal">
        <div class="category-icon">${icon}</div>
        <h3 class="category-name">${category.name}</h3>
        <p class="category-desc">${description}</p>
        <span class="category-link">Browse Products →</span>
      </a>
    `;
  },

  // Show default categories for category page
  showDefaultCategoriesPage(container) {
    const defaultCategories = [
      {
        id: 'window-handles',
        name: 'Window Handles',
        icon: '🪟',
        description: 'Replacement handles for uPVC, aluminium and timber windows'
      },
      {
        id: 'door-handles',
        name: 'Door Handles',
        icon: '🚪',
        description: 'Interior and exterior door handles in various finishes'
      },
      {
        id: 'letter-boxes',
        name: 'Letter Boxes',
        icon: '📬',
        description: 'Quality letter boxes and postal hardware'
      },
      {
        id: 'trickle-vents',
        name: 'Trickle Vents',
        icon: '🌬️',
        description: 'Ventilation solutions for windows and doors'
      },
      {
        id: 'lock-cylinders',
        name: 'Lock Cylinders',
        icon: '🔐',
        description: 'Euro cylinders and security hardware'
      },
      {
        id: 'bolts',
        name: 'Bolts',
        icon: '🔩',
        description: 'Door bolts, window bolts and security bolts'
      }
    ];

    container.innerHTML = '';
    defaultCategories.forEach(cat => {
      container.innerHTML += this.createDetailedCategoryCard(cat.id, cat);
    });
  },

  // Initialize
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.loadCategories());
    } else {
      this.loadCategories();
    }
  },

  // Main load function
  async loadCategories() {
    // Load categories based on current page
    if (window.location.pathname.includes('category.html')) {
      await this.loadCategoryPage();
    } else {
      await this.loadHomepageCategories();
    }
  }
};

// Export for use in other modules
export default CategoriesLoader;

// Auto-initialize when script loads
CategoriesLoader.init();