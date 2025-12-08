// Sales Utility Module
// This module handles sale price calculations across the entire website

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAeMt3Ahtg6FNRGY1cUuySoxUsJdzr7Z7A",
  authDomain: "k-highway-shop.firebaseapp.com",
  projectId: "k-highway-shop",
  storageBucket: "k-highway-shop.firebasestorage.app",
  messagingSenderId: "568359321582",
  appId: "1:568359321582:web:faf2b48cb3556664b898ff"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const Sales = {
  activeSales: [],
  salesCache: null,
  cacheExpiry: null,

  // Initialize and load active sales
  async init() {
    await this.loadActiveSales();
  },

  // Load all active sales from Firestore
  async loadActiveSales() {
    // Check cache first (cache for 5 minutes)
    const now = new Date();
    if (this.salesCache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.salesCache;
    }

    try {
      const salesQuery = query(
        collection(db, 'sales'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(salesQuery);

      this.activeSales = [];
      snapshot.forEach(doc => {
        const sale = { id: doc.id, ...doc.data() };
        const startDate = sale.startDate?.toDate ? sale.startDate.toDate() : new Date(sale.startDate);
        const endDate = sale.endDate?.toDate ? sale.endDate.toDate() : new Date(sale.endDate);

        // Only include sales that are currently active (within date range)
        if (now >= startDate && now <= endDate) {
          sale.startDate = startDate;
          sale.endDate = endDate;
          this.activeSales.push(sale);
        }
      });

      // Cache the results
      this.salesCache = this.activeSales;
      this.cacheExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

      return this.activeSales;
    } catch (error) {
      console.error('Error loading active sales:', error);
      return [];
    }
  },

  // Get sale for a specific product
  async getSaleForProduct(productId) {
    try {
      if (!this.activeSales || this.activeSales.length === 0) {
        await this.loadActiveSales();
      }

      // Find all sales that include this product
      const applicableSales = this.activeSales.filter(sale =>
        sale.products && sale.products.includes(productId)
      );

      if (applicableSales.length === 0) return null;

      // If multiple sales apply, return the one with the highest discount
      return applicableSales.reduce((best, current) => {
        if (!best) return current;

        // For comparison, we need to know the original price, but we'll handle that in calculateSalePrice
        // For now, return the sale with highest percentage or fixed amount
        if (current.type === 'percentage' && best.type === 'percentage') {
          return current.value > best.value ? current : best;
        } else if (current.type === 'fixed' && best.type === 'fixed') {
          return current.value > best.value ? current : best;
        } else if (current.type === 'percentage') {
          // Prefer percentage discounts (they're usually better for higher-priced items)
          return current;
        } else {
          return best;
        }
      }, null);
    } catch (error) {
      console.error('Error getting sale for product:', error);
      return null;
    }
  },

  // Calculate sale price for a product
  async calculateSalePrice(productId, originalPrice) {
    try {
      const sale = await this.getSaleForProduct(productId);

      if (!sale) {
        return {
          hasDiscount: false,
          originalPrice: originalPrice,
          salePrice: originalPrice,
          discount: 0,
          discountAmount: 0,
          saleName: null
        };
      }

      let salePrice = originalPrice;
      let discountAmount = 0;

      if (sale.type === 'percentage') {
        discountAmount = (originalPrice * sale.value) / 100;
        salePrice = originalPrice - discountAmount;
      } else if (sale.type === 'fixed') {
        discountAmount = sale.value;
        salePrice = Math.max(0, originalPrice - sale.value); // Don't go below 0
      }

      return {
        hasDiscount: true,
        originalPrice: originalPrice,
        salePrice: Math.max(0, salePrice),
        discount: sale.value,
        discountType: sale.type,
        discountAmount: discountAmount,
        saleName: sale.name,
        saleId: sale.id
      };
    } catch (error) {
      console.error('Error calculating sale price:', error);
      // Return no discount if there's an error
      return {
        hasDiscount: false,
        originalPrice: originalPrice,
        salePrice: originalPrice,
        discount: 0,
        discountAmount: 0,
        saleName: null
      };
    }
  },

  // Format price with sale badge (returns HTML)
  formatPriceWithSale(priceInfo) {
    if (!priceInfo.hasDiscount) {
      return `<span class="product-price">£${priceInfo.originalPrice.toFixed(2)}</span>`;
    }

    const savingsPercent = ((priceInfo.discountAmount / priceInfo.originalPrice) * 100).toFixed(0);

    return `
      <div class="price-container">
        <div class="price-with-sale">
          <span class="original-price">£${priceInfo.originalPrice.toFixed(2)}</span>
          <span class="sale-price">£${priceInfo.salePrice.toFixed(2)}</span>
        </div>
        <div class="sale-badge">Save ${savingsPercent}%</div>
      </div>
    `;
  },

  // Clear cache (useful when sales are updated in admin)
  clearCache() {
    this.salesCache = null;
    this.cacheExpiry = null;
    this.activeSales = [];
  }
};

// Make Sales globally available
window.Sales = Sales;

// Auto-initialize
Sales.init();

export default Sales;
