// Products Loader - Loads products from Firestore
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  getAuth,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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
const auth = getAuth(app);

// Products Loader object
const ProductsLoader = {
  isAdmin: false,
  userId: null,

  // Initialize
  async init() {
    // Check if user is admin
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.userId = user.uid;
        try {
          const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            this.isAdmin = userDoc.data().role === 'masterAdmin';
          }
        } catch (e) {
          console.log('Not admin');
        }
      }
      // Load products after auth check
      this.loadProducts();
    });
  },

  // Load products from Firestore
  async loadProducts() {
    try {
      // Load categories for the filter first
      await this.loadCategoryFilter();

      // Get all active products
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'active')
      );

      const productsSnap = await getDocs(productsQuery);

      if (productsSnap.empty) {
        console.log('No products in Firestore, using static products');
        return;
      }

      // Group products by category
      const productsByCategory = {};
      productsSnap.forEach(doc => {
        const product = { id: doc.id, ...doc.data() };
        const category = product.category || 'Other';

        if (!productsByCategory[category]) {
          productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
      });

      // Render products
      this.renderProducts(productsByCategory);

    } catch (error) {
      console.error('Error loading products:', error);
    }
  },

  // Load categories for filter dropdown
  async loadCategoryFilter() {
    try {
      const categoryFilter = document.getElementById('categoryFilter');
      if (!categoryFilter) return;

      // Clear existing options except "All Categories"
      categoryFilter.innerHTML = '<option value="all">All Categories</option>';

      // Load categories from Firestore
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));

      categoriesSnapshot.forEach(doc => {
        const category = doc.data();
        const option = document.createElement('option');
        option.value = category.slug || doc.id;
        option.textContent = category.name;
        categoryFilter.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading category filter:', error);
    }
  },

  // Render products to the page
  renderProducts(productsByCategory) {
    // Get product sections container
    const productSections = document.getElementById('productSections');
    if (productSections) {
      productSections.innerHTML = '';
    }

    // For each category, create a section and grid
    Object.keys(productsByCategory).forEach(category => {
      // Generate slug from category name
      const slug = category.toLowerCase().replace(/\s+/g, '-');

      // Create section for this category
      if (productSections) {
        const section = document.createElement('div');
        section.innerHTML = `
          <h2 class="section-title" id="${slug}">${category}</h2>
          <div class="products-grid reveal" data-category="${slug}"></div>
        `;
        productSections.appendChild(section);
      }

      // Find the grid for this category
      const grid = document.querySelector(`[data-category="${slug}"]`);
      if (!grid) return;

      // Clear existing products
      grid.innerHTML = '';

      // Add products
      productsByCategory[category].forEach(product => {
        const mainImage = product.images?.[0] || 'images/placeholder.jpg';
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.id = product.id;
        productCard.dataset.name = product.name;
        productCard.dataset.price = product.price;
        productCard.dataset.image = mainImage;

        productCard.innerHTML = `
          <div class="product-image">
            <img src="${mainImage}" alt="${product.name}">
          </div>
          <div class="product-body">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-price">£${product.price.toFixed(2)}</div>
            <div class="product-actions">
              <button class="product-btn btn-cart" onclick="addToCart(this)">🛒 Add</button>
              <a href="product-detail.html?id=${product.id}" class="product-btn">Details</a>
            </div>
          </div>
        `;

        grid.appendChild(productCard);
      });
    });
  },

  // Get a single product by ID
  async getProduct(productId) {
    try {
      const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        return { id: productDoc.id, ...productDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  }
};

// Make globally available
window.ProductsLoader = ProductsLoader;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ProductsLoader.init();
});

export default ProductsLoader;
