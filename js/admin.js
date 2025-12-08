// Admin Dashboard Module with Firebase Storage
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase config - must match firebase-compat.js
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Admin object
const Admin = {
  user: null,
  userRole: null,
  uploadedImages: [],
  editingProductId: null,
  variationTypeCounter: 0, // Counter for unique variation type IDs
  variationOptionCounter: 0, // Counter for unique variation option IDs

  // Initialize admin panel
  async init() {
    console.log('Admin init started');
    onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? user.uid : 'no user');
      if (user) {
        this.user = user;
        await this.checkAdminAccess();
      } else {
        console.log('No user - showing access denied');
        this.showAccessDenied();
      }
    });
  },

  // Check if user has admin access
  async checkAdminAccess() {
    try {
      console.log('Checking admin access for:', this.user.uid);
      const userDoc = await getDoc(doc(db, 'users', this.user.uid));
      console.log('User doc exists:', userDoc.exists());

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User data:', userData);
        console.log('User role:', userData.role);
        this.userRole = userData.role;

        if (userData.role === 'masterAdmin' || userData.role === 'admin') {
          console.log('Access granted - showing dashboard');
          this.showDashboard(userData);
          this.loadDashboardData();
        } else {
          console.log('Not admin role - access denied');
          this.showAccessDenied();
        }
      } else {
        console.log('User doc not found - access denied');
        this.showAccessDenied();
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      this.showAccessDenied();
    }
  },

  // Show dashboard
  showDashboard(userData) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('accessDenied').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';

    document.getElementById('adminName').textContent = userData.name || userData.email;
    document.getElementById('adminRole').textContent =
      userData.role === 'masterAdmin' ? 'Master Admin' : 'Admin';

    this.setupNavigation();
    this.setupImageUpload();
  },

  // Show access denied
  showAccessDenied() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('accessDenied').style.display = 'flex';
  },

  // Setup sidebar navigation
  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        this.showSection(section);
      });
    });
  },

  // Setup image upload
  setupImageUpload() {
    const imageInput = document.getElementById('productImages');
    if (imageInput) {
      imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
    }
  },

  // Handle image selection
  handleImageSelect(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('imagePreview');

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgContainer = document.createElement('div');
          imgContainer.className = 'preview-image';
          imgContainer.draggable = true;
          imgContainer.dataset.fileName = file.name;

          const isPrimary = preview.children.length === 0;
          imgContainer.innerHTML = `
            <img src="${event.target.result}" alt="Preview">
            <button type="button" class="remove-image" onclick="Admin.removePreviewImage(this, '${file.name}')">&times;</button>
            ${isPrimary ? '<span class="primary-badge">PRIMARY</span>' : ''}
            <span class="drag-handle">⋮⋮</span>
            <span class="image-name">${file.name}</span>
          `;

          this.addDragListeners(imgContainer);
          preview.appendChild(imgContainer);
        };
        reader.readAsDataURL(file);
        this.uploadedImages.push(file);
      }
    });
  },

  // Remove preview image
  removePreviewImage(btn, fileName) {
    btn.parentElement.remove();
    this.uploadedImages = this.uploadedImages.filter(f => f.name !== fileName);
    this.updatePrimaryBadges();
  },

  // Add drag and drop listeners
  addDragListeners(element) {
    element.addEventListener('dragstart', (e) => {
      element.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', element.dataset.fileName);
    });

    element.addEventListener('dragend', (e) => {
      element.classList.remove('dragging');
      // Clean up any drag-over classes
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Add visual feedback
      const dragging = document.querySelector('.dragging');
      if (dragging && element !== dragging) {
        element.classList.add('drag-over');
      }
    });

    element.addEventListener('dragleave', (e) => {
      element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-over');

      const preview = document.getElementById('imagePreview');
      const dragging = preview.querySelector('.dragging');

      if (dragging && element !== dragging) {
        // Get all images
        const allImages = Array.from(preview.children);
        const draggedIndex = allImages.indexOf(dragging);
        const targetIndex = allImages.indexOf(element);

        // Reorder in DOM
        if (draggedIndex < targetIndex) {
          element.parentNode.insertBefore(dragging, element.nextSibling);
        } else {
          element.parentNode.insertBefore(dragging, element);
        }

        this.reorderUploadedImages();
        this.updatePrimaryBadges();
      }
    });
  },

  // Get element after drag position (kept for compatibility but not used in grid)
  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.preview-image:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  },

  // Reorder uploaded images array based on DOM order
  reorderUploadedImages() {
    const preview = document.getElementById('imagePreview');
    const orderedFileNames = Array.from(preview.children).map(child => child.dataset.fileName);

    this.uploadedImages.sort((a, b) => {
      return orderedFileNames.indexOf(a.name) - orderedFileNames.indexOf(b.name);
    });
  },

  // Update primary badges
  updatePrimaryBadges() {
    const preview = document.getElementById('imagePreview');
    const images = preview.querySelectorAll('.preview-image');

    images.forEach((img, index) => {
      const existingBadge = img.querySelector('.primary-badge');
      if (index === 0 && !existingBadge) {
        const badge = document.createElement('span');
        badge.className = 'primary-badge';
        badge.textContent = 'PRIMARY';
        img.insertBefore(badge, img.querySelector('.drag-handle'));
      } else if (index !== 0 && existingBadge) {
        existingBadge.remove();
      }
    });
  },

  // Update primary badges for existing images
  updatePrimaryBadgesExisting() {
    const existingGrid = document.getElementById('existingImagesGrid');
    if (!existingGrid) return;
    const images = existingGrid.querySelectorAll('.preview-image:not([data-delete="true"])');

    images.forEach((img, index) => {
      const existingBadge = img.querySelector('.primary-badge');
      if (index === 0 && !existingBadge) {
        const badge = document.createElement('span');
        badge.className = 'primary-badge';
        badge.textContent = 'PRIMARY';
        img.insertBefore(badge, img.querySelector('.drag-handle'));
      } else if (index !== 0 && existingBadge) {
        existingBadge.remove();
      }
    });

    // Remove badges from deleted images
    const deletedImages = existingGrid.querySelectorAll('.preview-image[data-delete="true"]');
    deletedImages.forEach(img => {
      const badge = img.querySelector('.primary-badge');
      if (badge) badge.remove();
    });
  },

  // Add drag and drop listeners for existing images
  addDragListenersExisting(element) {
    element.addEventListener('dragstart', (e) => {
      element.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', element.dataset.imageUrl);
    });

    element.addEventListener('dragend', (e) => {
      element.classList.remove('dragging');
      // Clean up any drag-over classes
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Add visual feedback
      const dragging = document.querySelector('.dragging');
      if (dragging && element !== dragging) {
        element.classList.add('drag-over');
      }
    });

    element.addEventListener('dragleave', (e) => {
      element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-over');

      const existingGrid = document.getElementById('existingImagesGrid');
      const dragging = existingGrid.querySelector('.dragging');

      if (dragging && element !== dragging) {
        // Get all images
        const allImages = Array.from(existingGrid.children);
        const draggedIndex = allImages.indexOf(dragging);
        const targetIndex = allImages.indexOf(element);

        // Reorder in DOM
        if (draggedIndex < targetIndex) {
          element.parentNode.insertBefore(dragging, element.nextSibling);
        } else {
          element.parentNode.insertBefore(dragging, element);
        }

        this.updatePrimaryBadgesExisting();
      }
    });
  },

  // Show section
  showSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });

    document.querySelectorAll('.admin-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(`section-${sectionId}`).classList.add('active');

    const titles = {
      dashboard: 'Dashboard',
      products: 'Products',
      categories: 'Categories',
      orders: 'Orders',
      users: 'Users',
      settings: 'Store Settings'
    };
    document.getElementById('sectionTitle').textContent = titles[sectionId] || 'Dashboard';

    this.loadSectionData(sectionId);
  },

  // Load section data
  async loadSectionData(sectionId) {
    switch (sectionId) {
      case 'products':
        await this.loadProducts();
        break;
      case 'categories':
        await this.loadCategories();
        break;
      case 'orders':
        await this.loadOrders();
        break;
      case 'users':
        await this.loadUsers();
        break;
      case 'settings':
        await this.loadSettings();
        break;
      case 'messages':
        await this.loadMessages();
        break;
    }
  },

  // Load dashboard data
  async loadDashboardData() {
    try {
      const [productsSnap, ordersSnap, usersSnap, reviewsSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'reviews'))
      ]);

      document.getElementById('totalProducts').textContent = productsSnap.size;
      document.getElementById('totalOrders').textContent = ordersSnap.size;
      document.getElementById('totalUsers').textContent = usersSnap.size;
      document.getElementById('totalReviews').textContent = reviewsSnap.size;

      await this.loadRecentOrders();

      // Load messages to update unread badge
      await this.loadMessages();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  },

  // Load recent orders
  async loadRecentOrders() {
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));

      const tbody = document.getElementById('recentOrdersTable');

      if (ordersSnap.empty) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">No orders yet</td></tr>';
        return;
      }

      // Get all orders and sort by date descending
      const orders = [];
      ordersSnap.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      orders.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.date) || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.date) || new Date(0);
        return dateB - dateA;
      });

      // Show only first 5
      tbody.innerHTML = '';
      orders.slice(0, 5).forEach(order => {
        const date = order.createdAt?.toDate?.() || new Date(order.date) || new Date();
        tbody.innerHTML += `
          <tr>
            <td>#${order.id.slice(-6).toUpperCase()}</td>
            <td>${order.customerName || order.email || 'Guest'}</td>
            <td>£${order.total?.toFixed(2) || '0.00'}</td>
            <td><span class="badge badge-${this.getStatusBadge(order.status)}">${order.status || 'pending'}</span></td>
            <td>${date.toLocaleDateString()}</td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  },

  // Load products
  async loadProducts() {
    try {
      const productsSnap = await getDocs(collection(db, 'products'));
      const tbody = document.getElementById('productsTable');

      if (productsSnap.empty) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--gray-500);">No products yet. Click "+ Add New Product" to create one.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      productsSnap.forEach(docSnap => {
        const product = docSnap.data();
        const mainImage = product.images?.[0] || 'images/placeholder.jpg';
        const statusClass = product.status === 'active' ? 'badge-success' : 'badge-warning';

        tbody.innerHTML += `
          <tr>
            <td><img src="${mainImage}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"></td>
            <td>
              <strong>${product.name}</strong>
              ${product.sku ? `<br><small style="color: var(--gray-500);">SKU: ${product.sku}</small>` : ''}
            </td>
            <td>£${product.price?.toFixed(2) || '0.00'}</td>
            <td>${product.stock || 0}</td>
            <td>${product.category || '-'}</td>
            <td><span class="badge ${statusClass}">${product.status || 'active'}</span></td>
            <td>
              <button class="btn btn-secondary" onclick="Admin.editProduct('${docSnap.id}')" style="padding: 0.4rem 0.75rem; font-size: 0.8rem; margin-right: 0.25rem;">Edit</button>
              <button class="btn btn-danger" onclick="Admin.deleteProduct('${docSnap.id}')" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;">Delete</button>
            </td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error loading products:', error);
      document.getElementById('productsTable').innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Error loading products</td></tr>';
    }
  },

  // Load categories
  async loadCategories() {
    try {
      const categoriesSnap = await getDocs(collection(db, 'categories'));
      const tbody = document.getElementById('categoriesTable');

      if (categoriesSnap.empty) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">No categories yet. Click "+ Add Category" to create one.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      categoriesSnap.forEach(doc => {
        const category = doc.data();
        tbody.innerHTML += `
          <tr>
            <td style="font-size: 1.5rem;">${category.icon || '📁'}</td>
            <td>${category.name}</td>
            <td>${category.slug}</td>
            <td>${category.productCount || 0}</td>
            <td>
              <button class="btn btn-secondary" onclick="Admin.editCategory('${doc.id}')" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;">Edit</button>
              <button class="btn btn-danger" onclick="Admin.deleteCategory('${doc.id}')" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;">Delete</button>
            </td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  },

  // Store orders for filtering
  allOrders: [],
  orderViewMode: 'table', // 'table' or 'cards'

  // Load orders
  async loadOrders() {
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const container = document.getElementById('ordersContainer');

      if (ordersSnap.empty) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--gray-500);">No orders yet</div>';
        return;
      }

      // Get all orders and sort by date descending
      this.allOrders = [];
      ordersSnap.forEach(doc => {
        this.allOrders.push({ id: doc.id, ...doc.data() });
      });
      this.allOrders.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.date) || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.date) || new Date(0);
        return dateB - dateA;
      });

      this.renderOrders(this.allOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  },

  // Toggle between table and card view
  toggleOrderView() {
    this.orderViewMode = this.orderViewMode === 'table' ? 'cards' : 'table';
    const btn = document.getElementById('toggleOrderViewBtn');
    btn.innerHTML = this.orderViewMode === 'table' ? '📋 Detailed View' : '📊 Table View';
    // Re-apply current filter
    const currentFilter = document.getElementById('orderStatusFilter').value;
    this.filterOrders(currentFilter);
  },

  // Filter orders by status
  filterOrders(status) {
    if (status === 'all') {
      this.renderOrders(this.allOrders);
    } else {
      const filtered = this.allOrders.filter(o => o.status === status);
      this.renderOrders(filtered);
    }
  },

  // Render orders (table or cards based on mode)
  renderOrders(orders) {
    const container = document.getElementById('ordersContainer');

    if (orders.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--gray-500);">No orders found</div>';
      return;
    }

    if (this.orderViewMode === 'table') {
      this.renderOrdersTable(orders);
    } else {
      this.renderOrdersCards(orders);
    }
  },

  // Render orders as table
  renderOrdersTable(orders) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => {
            const date = order.createdAt?.toDate?.() || new Date(order.date) || new Date();
            const itemCount = order.items?.length || 0;
            const statusClass = this.getStatusBadge(order.status);
            return `
              <tr>
                <td>#${order.orderId || order.id.slice(-8).toUpperCase()}</td>
                <td>${order.customerName || order.email || 'Guest'}</td>
                <td>${itemCount} items</td>
                <td>£${order.total?.toFixed(2) || '0.00'}</td>
                <td><span class="badge badge-${statusClass}">${order.status || 'pending'}</span></td>
                <td>${date.toLocaleDateString()}</td>
                <td>
                  <select onchange="Admin.updateOrderStatus('${order.id}', this.value)" class="form-control" style="padding: 0.4rem; font-size: 0.8rem; width: auto;">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  // Render orders as cards
  renderOrdersCards(orders) {
    const container = document.getElementById('ordersContainer');

    container.innerHTML = `<div class="admin-orders-list">${orders.map(order => {
      const date = order.createdAt?.toDate?.() || new Date(order.date) || new Date();
      const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const statusClass = `order-status-${order.status || 'pending'}`;
      const statusText = { pending: 'Pending', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }[order.status] || 'Pending';

      // Render items (includes variation label if present)
      const itemsHtml = (order.items || []).map(item => `
        <div class="admin-order-item">
          <div class="admin-order-item-img">
            <img src="${item.image || 'images/placeholder.jpg'}" alt="${item.name}">
          </div>
          <div class="admin-order-item-details">
            <div class="admin-order-item-name">${item.name}</div>
            ${item.variationLabel ? `<div class="admin-order-item-variation" style="font-size: 0.75rem; color: var(--gray-500);">Pack: ${item.variationLabel}</div>` : ''}
            <div class="admin-order-item-meta">Qty: ${item.quantity} × £${item.price?.toFixed(2) || '0.00'}</div>
          </div>
          <div class="admin-order-item-price">£${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
        </div>
      `).join('') || '<p style="color: var(--gray-500); font-size: 0.9rem;">No item details available</p>';

      // Customer info
      const shipping = order.shipping || order;
      const customerName = order.customerName || `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() || 'Guest';
      const email = order.email || order.userEmail || '';
      const phone = shipping.phone || order.phone || '';
      const address = shipping.address ? `${shipping.address}${shipping.address2 ? ', ' + shipping.address2 : ''}, ${shipping.city || ''}, ${shipping.postcode || ''}` : 'No address';

      return `
        <div class="admin-order-card">
          <div class="admin-order-header">
            <div class="admin-order-info">
              <div class="admin-order-info-item">
                <span class="admin-order-info-label">Order ID</span>
                <span class="admin-order-info-value">#${order.orderId || order.id.slice(-8).toUpperCase()}</span>
              </div>
              <div class="admin-order-info-item">
                <span class="admin-order-info-label">Date</span>
                <span class="admin-order-info-value">${dateStr}</span>
              </div>
              <div class="admin-order-info-item">
                <span class="admin-order-info-label">Customer</span>
                <span class="admin-order-info-value">${customerName}</span>
              </div>
            </div>
            <span class="order-status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="admin-order-body">
            <div class="admin-order-items">
              ${itemsHtml}
            </div>
            <div class="admin-order-customer">
              <div class="admin-order-customer-title">Customer & Delivery Details</div>
              <div class="admin-order-customer-info">
                <div class="admin-order-customer-item">
                  <strong>Email</strong>
                  ${email || 'N/A'}
                </div>
                <div class="admin-order-customer-item">
                  <strong>Phone</strong>
                  ${phone || 'N/A'}
                </div>
                <div class="admin-order-customer-item" style="grid-column: 1/-1;">
                  <strong>Delivery Address</strong>
                  ${address}
                </div>
                ${order.deliveryMethod ? `<div class="admin-order-customer-item"><strong>Delivery Method</strong>${order.deliveryMethod}</div>` : ''}
                ${order.deliveryInstructions ? `<div class="admin-order-customer-item"><strong>Instructions</strong>${order.deliveryInstructions}</div>` : ''}
              </div>
            </div>
          </div>
          <div class="admin-order-footer">
            <div class="admin-order-total">Total: £${order.total?.toFixed(2) || '0.00'}</div>
            <div class="admin-order-actions">
              <select onchange="Admin.updateOrderStatus('${order.id}', this.value)" class="form-control" style="padding: 0.5rem; font-size: 0.85rem; width: auto;">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      `;
    }).join('')}</div>`;
  },

  // Load users
  async loadUsers() {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const tbody = document.getElementById('usersTable');

      if (usersSnap.empty) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">No users yet</td></tr>';
        return;
      }

      // Create a map of emails by name from orders
      const emailsByName = {};
      const ordersByEmail = {};
      ordersSnap.forEach(doc => {
        const order = doc.data();
        const email = (order.userEmail || order.email || '').toLowerCase();
        const nameKey = `${(order.firstName || '').toLowerCase()}_${(order.lastName || '').toLowerCase()}`;

        if (nameKey !== '_' && email && !emailsByName[nameKey]) {
          emailsByName[nameKey] = email;
        }

        if (email) {
          if (!ordersByEmail[email]) {
            ordersByEmail[email] = [];
          }
          ordersByEmail[email].push(order);
        }
      });

      tbody.innerHTML = '';
      usersSnap.forEach(doc => {
        const user = doc.data();
        const date = user.createdAt?.toDate?.() || new Date();
        const roleBadge = user.role === 'masterAdmin' ? 'badge-danger' :
                         user.role === 'admin' ? 'badge-warning' : 'badge-info';
        const userName = user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.lastName || user.name || 'No name';

        // Get email from user document, or find it from orders by matching name
        let userEmail = user.email || '';
        if (!userEmail && user.firstName && user.lastName) {
          const nameKey = `${user.firstName.toLowerCase()}_${user.lastName.toLowerCase()}`;
          userEmail = emailsByName[nameKey] || '';
        }

        // Count orders for this user
        const userOrderCount = userEmail ? (ordersByEmail[userEmail.toLowerCase()]?.length || 0) : 0;

        tbody.innerHTML += `
          <tr>
            <td>${userName}</td>
            <td>${userEmail || '<span style="color: #ef4444;">No email found</span>'}</td>
            <td><span class="badge ${roleBadge}">${user.role || 'user'}</span></td>
            <td>${date.toLocaleDateString()}</td>
            <td>${userOrderCount}</td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error loading users:', error);
    }
  },

  // Load settings
  async loadSettings() {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'store'));
      if (configDoc.exists()) {
        const config = configDoc.data();
        document.getElementById('settingStoreName').value = config.storeName || '';
        document.getElementById('settingEmail').value = config.email || '';
        document.getElementById('settingPhone').value = config.phone || '';
        document.getElementById('settingCurrency').value = config.currency || 'GBP';
        document.getElementById('settingAddress').value = config.address || '';
        document.getElementById('settingHours').value = config.businessHours || '';
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    document.getElementById('storeSettingsForm').onsubmit = async (e) => {
      e.preventDefault();
      await this.saveSettings();
    };
  },

  // Save settings
  async saveSettings() {
    if (this.userRole !== 'masterAdmin') {
      alert('Only Master Admin can modify store settings');
      return;
    }

    try {
      await setDoc(doc(db, 'config', 'store'), {
        storeName: document.getElementById('settingStoreName').value,
        email: document.getElementById('settingEmail').value,
        phone: document.getElementById('settingPhone').value,
        currency: document.getElementById('settingCurrency').value,
        address: document.getElementById('settingAddress').value,
        businessHours: document.getElementById('settingHours').value,
        updatedAt: serverTimestamp(),
        updatedBy: this.user.uid
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + error.message);
    }
  },

  // Get status badge class
  getStatusBadge(status) {
    const badges = {
      pending: 'warning',
      processing: 'info',
      shipped: 'info',
      delivered: 'success',
      cancelled: 'danger'
    };
    return badges[status] || 'info';
  },

  // Show product modal
  async showProductModal(productId = null) {
    if (this.userRole !== 'masterAdmin') {
      alert('Only Master Admin can manage products');
      return;
    }

    this.editingProductId = productId;
    this.uploadedImages = [];

    document.getElementById('productModalTitle').textContent = productId ? 'Edit Product' : 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = productId || '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('existingImages').innerHTML = '';

    // Clear variations section
    this.clearVariationsSection();

    // Load categories dynamically before showing the modal
    await this.loadCategoriesForDropdown();

    if (productId) {
      this.loadProductForEdit(productId);
    }

    document.getElementById('productModal').classList.add('active');
  },

  closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    this.uploadedImages = [];
    this.editingProductId = null;
  },

  // Load categories from Firestore for the product dropdown
  async loadCategoriesForDropdown() {
    const categorySelect = document.getElementById('productCategory');
    if (!categorySelect) return;

    try {
      // Keep the first "Select Category" option
      categorySelect.innerHTML = '<option value="">Select Category</option>';

      // Load categories from Firestore
      const categoriesQuery = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snapshot = await getDocs(categoriesQuery);

      if (snapshot.empty) {
        categorySelect.innerHTML += '<option value="" disabled>No categories - Add categories first</option>';
        return;
      }

      snapshot.forEach(doc => {
        const category = doc.data();
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });

      console.log('Categories loaded for dropdown:', snapshot.size);
    } catch (error) {
      console.error('Error loading categories for dropdown:', error);
    }
  },

  async loadProductForEdit(productId) {
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        const product = productDoc.data();
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productStock').value = product.stock || 0;
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productBrand').value = product.brand || '';
        document.getElementById('productSku').value = product.sku || '';
        document.getElementById('productStatus').value = product.status || 'active';

        // Load features as newline-separated text
        if (product.features && Array.isArray(product.features)) {
          document.getElementById('productFeatures').value = product.features.join('\n');
        } else {
          document.getElementById('productFeatures').value = '';
        }

        // Load specs as "Label: Value" format
        if (product.specifications && typeof product.specifications === 'object') {
          const specsText = Object.entries(product.specifications)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          document.getElementById('productSpecs').value = specsText;
        } else {
          document.getElementById('productSpecs').value = '';
        }

        // Show existing images
        if (product.images && product.images.length > 0) {
          const existingDiv = document.getElementById('existingImages');
          existingDiv.innerHTML = '<p style="margin-bottom: 0.5rem; font-weight: 600;">Current Images:</p><div class="image-preview-grid" id="existingImagesGrid"></div>';
          const existingGrid = document.getElementById('existingImagesGrid');

          product.images.forEach((url, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'preview-image existing';
            imgContainer.draggable = true;
            imgContainer.dataset.imageUrl = url;
            imgContainer.innerHTML = `
              <img src="${url}" alt="Product image ${index + 1}">
              <button type="button" class="remove-image" onclick="Admin.markImageForDeletion(this, '${url}')">&times;</button>
              ${index === 0 ? '<span class="primary-badge">PRIMARY</span>' : ''}
              <span class="drag-handle">⋮⋮</span>
            `;
            this.addDragListenersExisting(imgContainer);
            existingGrid.appendChild(imgContainer);
          });
        }

        // Load variations if product has them
        if (product.hasVariations) {
          // Support both old format (variations array) and new format (variationTypes array)
          if (product.variationTypes && product.variationTypes.length > 0) {
            this.loadVariationsToForm(product.variationTypes);
          } else if (product.variations && product.variations.length > 0) {
            // Convert old format to new format for backward compatibility
            const convertedTypes = [{
              id: 'type-1',
              name: 'Pack Size',
              options: product.variations.map(v => ({
                id: v.id,
                name: v.label,
                priceAdjustment: v.price - product.price,
                stock: v.stock || 0
              }))
            }];
            this.loadVariationsToForm(convertedTypes);
          }
        }
      }
    } catch (error) {
      console.error('Error loading product:', error);
      alert('Error loading product details');
    }
  },

  // Mark image for deletion
  markImageForDeletion(btn, url) {
    btn.parentElement.style.opacity = '0.3';
    btn.parentElement.dataset.delete = 'true';
    btn.innerHTML = '↩';
    btn.onclick = () => this.unmarkImageForDeletion(btn, url);
    this.updatePrimaryBadgesExisting();
  },

  unmarkImageForDeletion(btn, url) {
    btn.parentElement.style.opacity = '1';
    delete btn.parentElement.dataset.delete;
    btn.innerHTML = '&times;';
    btn.onclick = () => this.markImageForDeletion(btn, url);
    this.updatePrimaryBadgesExisting();
  },

  // Upload images to Firebase Storage
  async uploadImages(productId) {
    const imageUrls = [];

    for (let i = 0; i < this.uploadedImages.length; i++) {
      const file = this.uploadedImages[i];
      const timestamp = Date.now();
      const fileName = `${timestamp}_${i}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `products/${productId}/${fileName}`);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    return imageUrls;
  },

  // Save product
  async saveProduct() {
    if (this.userRole !== 'masterAdmin') {
      alert('Only Master Admin can manage products');
      return;
    }

    const name = document.getElementById('productName').value.trim();
    const price = document.getElementById('productPrice').value;
    const category = document.getElementById('productCategory').value;

    // Validation
    if (!name) {
      alert('Product name is required');
      return;
    }
    if (!price || price <= 0) {
      alert('Valid price is required');
      return;
    }
    if (!category) {
      alert('Category is required');
      return;
    }

    const saveBtn = document.querySelector('#productModal .btn-primary');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const productId = this.editingProductId ||
                       document.getElementById('productSku').value.toLowerCase().replace(/[^a-z0-9]/g, '-') ||
                       name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

      // Get existing images in DOM order (excluding deleted ones)
      let existingImages = [];
      if (this.editingProductId) {
        const existingGrid = document.getElementById('existingImagesGrid');
        if (existingGrid) {
          const existingImgDivs = existingGrid.querySelectorAll('.preview-image:not([data-delete="true"])');
          existingImgDivs.forEach(div => {
            const img = div.querySelector('img');
            if (img) {
              existingImages.push(img.src);
            }
          });
        }
      }

      // Upload new images
      let newImageUrls = [];
      if (this.uploadedImages.length > 0) {
        newImageUrls = await this.uploadImages(productId);
      }

      // Combine images
      const allImages = [...existingImages, ...newImageUrls];

      if (allImages.length === 0 && !this.editingProductId) {
        alert('Please upload at least one product image');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';
        return;
      }

      // Parse features (newline-separated)
      const featuresText = document.getElementById('productFeatures').value.trim();
      const features = featuresText ? featuresText.split('\n').map(f => f.trim()).filter(f => f) : [];

      // Parse specifications (Label: Value format)
      const specsText = document.getElementById('productSpecs').value.trim();
      const specifications = {};
      if (specsText) {
        specsText.split('\n').forEach(line => {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            if (key && value) {
              specifications[key] = value;
            }
          }
        });
      }

      // Handle variations
      const hasVariations = document.getElementById('hasVariations').checked;
      const variationTypes = hasVariations ? this.getVariationsFromForm() : [];

      // Validate variations if enabled
      if (hasVariations && variationTypes.length === 0) {
        alert('Please add at least one variation type with options');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';
        return;
      }

      // Validate that each variation type has at least one option
      if (hasVariations) {
        for (const type of variationTypes) {
          if (!type.options || type.options.length === 0) {
            alert(`Variation type "${type.name}" must have at least one option`);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Product';
            return;
          }
        }
      }

      const productData = {
        name: name,
        description: document.getElementById('productDescription').value.trim(),
        price: parseFloat(price),
        stock: parseInt(document.getElementById('productStock').value) || 0,
        category: category,
        brand: document.getElementById('productBrand').value.trim(),
        sku: document.getElementById('productSku').value.trim(),
        status: document.getElementById('productStatus').value,
        images: allImages,
        features: features,
        specifications: specifications,
        hasVariations: hasVariations,
        variationTypes: variationTypes,
        updatedAt: serverTimestamp(),
        updatedBy: this.user.uid
      };

      if (!this.editingProductId) {
        productData.createdAt = serverTimestamp();
        productData.createdBy = this.user.uid;
      }

      await setDoc(doc(db, 'products', productId), productData, { merge: true });

      alert('Product saved successfully!');
      this.closeProductModal();
      this.loadProducts();
      this.loadDashboardData();

    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product: ' + error.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Product';
    }
  },

  async editProduct(productId) {
    this.showProductModal(productId);
  },

  // Toggle variations section visibility
  toggleVariationsSection() {
    const checkbox = document.getElementById('hasVariations');
    const section = document.getElementById('variationsSection');

    if (checkbox.checked) {
      section.style.display = 'block';
      // Add first variation type if none exist
      const list = document.getElementById('variationTypesList');
      if (list.children.length === 0) {
        this.addVariationType();
      }
    } else {
      section.style.display = 'none';
    }
  },

  // Add a new variation type
  addVariationType(data = {}) {
    const list = document.getElementById('variationTypesList');
    this.variationTypeCounter++;

    const typeId = data.id || `type-${this.variationTypeCounter}`;
    const container = document.createElement('div');
    container.className = 'variation-type-container';
    container.dataset.typeId = typeId;

    container.innerHTML = `
      <div class="variation-type-header">
        <div class="variation-type-title">
          <span style="font-weight: 700; color: var(--secondary);">Variation Type:</span>
          <input type="text" class="variation-type-name" placeholder="e.g., Gasket Type, Length, Pack Size" value="${data.name || ''}" required>
        </div>
        <button type="button" class="btn-remove-variation-type" onclick="Admin.removeVariationType(this)">Remove Type</button>
      </div>
      <div class="variation-option-header">
        <span>Option Name</span>
        <span>Price Adj (£)</span>
        <span>Stock</span>
        <span></span>
      </div>
      <div class="variation-options-list" data-type-id="${typeId}">
        <!-- Options will be added here -->
      </div>
      <button type="button" class="btn-add-option" onclick="Admin.addVariationOption('${typeId}')">+ Add Option</button>
    `;

    list.appendChild(container);

    // Add first option or load existing options
    if (data.options && data.options.length > 0) {
      data.options.forEach(option => {
        this.addVariationOption(typeId, option);
      });
    } else {
      this.addVariationOption(typeId);
    }
  },

  // Remove a variation type
  removeVariationType(btn) {
    const container = btn.closest('.variation-type-container');
    if (container) {
      container.remove();
      // If no more variation types, uncheck the toggle
      const list = document.getElementById('variationTypesList');
      if (list.children.length === 0) {
        document.getElementById('hasVariations').checked = false;
        document.getElementById('variationsSection').style.display = 'none';
      }
    }
  },

  // Add a new variation option to a specific type
  addVariationOption(typeId, data = {}) {
    const optionsList = document.querySelector(`.variation-options-list[data-type-id="${typeId}"]`);
    if (!optionsList) return;

    this.variationOptionCounter++;

    const row = document.createElement('div');
    row.className = 'variation-option-row';
    row.dataset.optionId = data.id || `option-${this.variationOptionCounter}`;

    row.innerHTML = `
      <input type="text" class="option-name-input" placeholder="e.g., EPDM, Silicone, 100mm" value="${data.name || ''}" required>
      <input type="number" class="option-price-input" placeholder="0.00" step="0.01" value="${data.priceAdjustment || 0}">
      <input type="number" class="option-stock-input" placeholder="0" min="0" value="${data.stock || 0}">
      <button type="button" class="btn-remove-option" onclick="Admin.removeVariationOption(this)" title="Remove option">&times;</button>
    `;

    optionsList.appendChild(row);
  },

  // Remove a variation option
  removeVariationOption(btn) {
    const row = btn.closest('.variation-option-row');
    const optionsList = row.closest('.variation-options-list');
    if (row) {
      row.remove();
      // If no more options in this type, keep at least the empty state
      if (optionsList && optionsList.children.length === 0) {
        const typeId = optionsList.dataset.typeId;
        this.addVariationOption(typeId);
      }
    }
  },

  // Get all variation types and options from the form
  getVariationsFromForm() {
    const typeContainers = document.querySelectorAll('.variation-type-container');
    const variationTypes = [];

    typeContainers.forEach(container => {
      const typeId = container.dataset.typeId;
      const typeName = container.querySelector('.variation-type-name').value.trim();

      if (!typeName) return; // Skip if no type name

      const optionRows = container.querySelectorAll('.variation-option-row');
      const options = [];

      optionRows.forEach(row => {
        const name = row.querySelector('.option-name-input').value.trim();
        const priceAdjustment = parseFloat(row.querySelector('.option-price-input').value) || 0;
        const stock = parseInt(row.querySelector('.option-stock-input').value) || 0;

        if (name) {
          options.push({
            id: row.dataset.optionId,
            name: name,
            priceAdjustment: priceAdjustment,
            stock: stock
          });
        }
      });

      if (options.length > 0) {
        variationTypes.push({
          id: typeId,
          name: typeName,
          options: options
        });
      }
    });

    return variationTypes;
  },

  // Clear variations section
  clearVariationsSection() {
    const list = document.getElementById('variationTypesList');
    list.innerHTML = '';
    document.getElementById('hasVariations').checked = false;
    document.getElementById('variationsSection').style.display = 'none';
    this.variationTypeCounter = 0;
    this.variationOptionCounter = 0;
  },

  // Load variations into the form (for editing)
  loadVariationsToForm(variationTypes) {
    this.clearVariationsSection();

    if (variationTypes && variationTypes.length > 0) {
      document.getElementById('hasVariations').checked = true;
      document.getElementById('variationsSection').style.display = 'block';

      variationTypes.forEach(type => {
        this.addVariationType(type);
      });
    }
  },

  // ===== MESSAGES MANAGEMENT =====
  allMessages: [],
  filteredMessages: [],

  async loadMessages() {
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      this.allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.filteredMessages = [...this.allMessages];
      this.renderMessages();
      this.updateUnreadBadge();
    } catch (error) {
      console.error('Error loading messages:', error);
      const container = document.getElementById('messagesContainer');
      if (container) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Error loading messages</p>';
      }
    }
  },

  renderMessages() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    if (this.filteredMessages.length === 0) {
      container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--gray-500);">No messages found</p>';
      return;
    }

    container.innerHTML = this.filteredMessages.map(msg => {
      const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
      const dateStr = date.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const isUnread = msg.status === 'unread';
      const subjectLabels = {
        'general': 'General Inquiry',
        'product': 'Product Question',
        'order': 'Order Status',
        'returns': 'Returns & Refunds',
        'other': 'Other'
      };

      return `
        <div class="message-card ${isUnread ? 'unread' : ''}" data-id="${msg.id}">
          <div class="message-card-header">
            <div>
              <div class="message-sender">${msg.firstName} ${msg.lastName}</div>
              <div class="message-email">${msg.email}${msg.phone ? ` • ${msg.phone}` : ''}</div>
              <span class="message-subject">${subjectLabels[msg.subject] || msg.subject}</span>
            </div>
            <div class="message-date">${dateStr}</div>
          </div>
          <div class="message-content">${this.escapeHtml(msg.message)}</div>
          <div class="message-actions">
            ${isUnread ? `<button class="btn btn-primary btn-sm" onclick="Admin.markMessageRead('${msg.id}')">Mark as Read</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="Admin.replyToMessage('${msg.email}')">Reply via Email</button>
            <button class="btn btn-danger btn-sm" onclick="Admin.deleteMessage('${msg.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  filterMessages(status) {
    if (status === 'all') {
      this.filteredMessages = [...this.allMessages];
    } else {
      this.filteredMessages = this.allMessages.filter(m => m.status === status);
    }
    this.renderMessages();
  },

  async markMessageRead(messageId) {
    try {
      await updateDoc(doc(db, 'messages', messageId), { status: 'read' });
      const msg = this.allMessages.find(m => m.id === messageId);
      if (msg) msg.status = 'read';
      this.filterMessages(document.getElementById('messageStatusFilter').value);
      this.updateUnreadBadge();
    } catch (error) {
      console.error('Error marking message as read:', error);
      alert('Error updating message');
    }
  },

  async markAllMessagesRead() {
    try {
      const unreadMessages = this.allMessages.filter(m => m.status === 'unread');
      for (const msg of unreadMessages) {
        await updateDoc(doc(db, 'messages', msg.id), { status: 'read' });
        msg.status = 'read';
      }
      this.filterMessages(document.getElementById('messageStatusFilter').value);
      this.updateUnreadBadge();
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      alert('Error updating messages');
    }
  },

  async deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await deleteDoc(doc(db, 'messages', messageId));
      this.allMessages = this.allMessages.filter(m => m.id !== messageId);
      this.filterMessages(document.getElementById('messageStatusFilter').value);
      this.updateUnreadBadge();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Error deleting message');
    }
  },

  replyToMessage(email) {
    window.open(`mailto:${email}`, '_blank');
  },

  updateUnreadBadge() {
    const unreadCount = this.allMessages.filter(m => m.status === 'unread').length;
    const badge = document.getElementById('unreadBadge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  async deleteProduct(productId) {
    if (this.userRole !== 'masterAdmin') {
      alert('Only Master Admin can delete products');
      return;
    }

    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

    try {
      // Delete images from storage
      try {
        const folderRef = ref(storage, `products/${productId}`);
        const fileList = await listAll(folderRef);
        await Promise.all(fileList.items.map(item => deleteObject(item)));
      } catch (e) {
        console.log('No images to delete or error deleting:', e);
      }

      // Delete product document
      await deleteDoc(doc(db, 'products', productId));

      alert('Product deleted successfully!');
      this.loadProducts();
      this.loadDashboardData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product: ' + error.message);
    }
  },

  // Category modal functions
  categoryImageFile: null,

  showCategoryModal(categoryId = null) {
    if (this.userRole !== 'masterAdmin') {
      alert('Only Master Admin can manage categories');
      return;
    }

    document.getElementById('categoryModalTitle').textContent = categoryId ? 'Edit Category' : 'Add Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = categoryId || '';
    document.getElementById('categoryImagePreview').innerHTML = '';
    this.categoryImageFile = null;

    // Setup image preview handler
    const imageInput = document.getElementById('categoryImage');
    imageInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.categoryImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('categoryImagePreview').innerHTML = `
            <img src="${e.target.result}" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #e2e8f0;">
          `;
        };
        reader.readAsDataURL(file);
      }
    };

    if (categoryId) {
      this.loadCategoryForEdit(categoryId);
    }

    document.getElementById('categoryModal').classList.add('active');
  },

  closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
    this.categoryImageFile = null;
  },

  async loadCategoryForEdit(categoryId) {
    try {
      const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
      if (categoryDoc.exists()) {
        const category = categoryDoc.data();
        document.getElementById('categoryName').value = category.name || '';
        document.getElementById('categorySlug').value = category.slug || '';
        document.getElementById('categoryIcon').value = category.icon || '';
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categoryOrder').value = category.order || 999;

        // Show existing image if any
        if (category.image) {
          document.getElementById('categoryImagePreview').innerHTML = `
            <img src="${category.image}" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="font-size: 0.8rem; color: #64748b; margin-top: 5px;">Current image (upload new to replace)</p>
          `;
        }
      }
    } catch (error) {
      console.error('Error loading category:', error);
    }
  },

  async saveCategory() {
    if (this.userRole !== 'masterAdmin') {
      alert('Only Master Admin can manage categories');
      return;
    }

    const categoryId = document.getElementById('categoryId').value ||
                      document.getElementById('categorySlug').value.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const categoryData = {
      name: document.getElementById('categoryName').value,
      slug: document.getElementById('categorySlug').value,
      icon: document.getElementById('categoryIcon').value,
      description: document.getElementById('categoryDescription').value,
      order: parseInt(document.getElementById('categoryOrder')?.value) || 999,
      link: `products.html#${document.getElementById('categorySlug').value}`,
      updatedAt: serverTimestamp(),
      updatedBy: this.user.uid
    };

    try {
      // Upload image if selected
      if (this.categoryImageFile) {
        const imageRef = ref(storage, `categories/${categoryId}/${Date.now()}_${this.categoryImageFile.name}`);
        await uploadBytes(imageRef, this.categoryImageFile);
        const imageUrl = await getDownloadURL(imageRef);
        categoryData.image = imageUrl;
      }

      await setDoc(doc(db, 'categories', categoryId), categoryData, { merge: true });
      alert('Category saved successfully!');
      this.closeCategoryModal();
      this.loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category: ' + error.message);
    }
  },

  async editCategory(categoryId) {
    this.showCategoryModal(categoryId);
  },

  async deleteCategory(categoryId) {
    if (this.userRole !== 'masterAdmin') {
      alert('Only Master Admin can delete categories');
      return;
    }

    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      alert('Category deleted successfully!');
      this.loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category: ' + error.message);
    }
  },

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: status,
        updatedAt: serverTimestamp(),
        updatedBy: this.user.uid
      });
      // Update the order in the local array and re-render
      const orderIndex = this.allOrders.findIndex(o => o.id === orderId);
      if (orderIndex !== -1) {
        this.allOrders[orderIndex].status = status;
      }
      // Re-apply current filter
      const currentFilter = document.getElementById('orderStatusFilter').value;
      this.filterOrders(currentFilter);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order: ' + error.message);
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
};

// Make Admin globally available
window.Admin = Admin;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});
