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
          imgContainer.innerHTML = `
            <img src="${event.target.result}" alt="Preview">
            <button type="button" class="remove-image" onclick="Admin.removePreviewImage(this, '${file.name}')">&times;</button>
            <span class="image-name">${file.name}</span>
          `;
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

  // Load orders
  async loadOrders() {
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const tbody = document.getElementById('ordersTable');

      if (ordersSnap.empty) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--gray-500);">No orders yet</td></tr>';
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

      tbody.innerHTML = '';
      orders.forEach(order => {
        const date = order.createdAt?.toDate?.() || new Date(order.date) || new Date();
        const itemCount = order.items?.length || 0;
        tbody.innerHTML += `
          <tr>
            <td>#${order.id.slice(-6).toUpperCase()}</td>
            <td>${order.customerName || order.email || 'Guest'}</td>
            <td>${itemCount} items</td>
            <td>£${order.total?.toFixed(2) || '0.00'}</td>
            <td>
              <select onchange="Admin.updateOrderStatus('${order.id}', this.value)" class="form-control" style="padding: 0.4rem; font-size: 0.8rem; width: auto;">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
            <td>${date.toLocaleDateString()}</td>
            <td>
              <button class="btn btn-secondary" onclick="Admin.viewOrder('${order.id}')" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;">View</button>
            </td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  },

  // Load users
  async loadUsers() {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const tbody = document.getElementById('usersTable');

      if (usersSnap.empty) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">No users yet</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      usersSnap.forEach(doc => {
        const user = doc.data();
        const date = user.createdAt?.toDate?.() || new Date();
        const roleBadge = user.role === 'masterAdmin' ? 'badge-danger' :
                         user.role === 'admin' ? 'badge-warning' : 'badge-info';
        tbody.innerHTML += `
          <tr>
            <td>${user.name || 'No name'}</td>
            <td>${user.email}</td>
            <td><span class="badge ${roleBadge}">${user.role || 'user'}</span></td>
            <td>${date.toLocaleDateString()}</td>
            <td>${user.orderCount || 0}</td>
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

        // Load eBay URL
        document.getElementById('productEbayUrl').value = product.ebayUrl || '';

        // Show existing images
        if (product.images && product.images.length > 0) {
          const existingDiv = document.getElementById('existingImages');
          existingDiv.innerHTML = '<p style="margin-bottom: 0.5rem; font-weight: 600;">Current Images:</p>';
          product.images.forEach((url, index) => {
            existingDiv.innerHTML += `
              <div class="preview-image existing">
                <img src="${url}" alt="Product image ${index + 1}">
                <button type="button" class="remove-image" onclick="Admin.markImageForDeletion(this, '${url}')">&times;</button>
              </div>
            `;
          });
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
  },

  unmarkImageForDeletion(btn, url) {
    btn.parentElement.style.opacity = '1';
    delete btn.parentElement.dataset.delete;
    btn.innerHTML = '&times;';
    btn.onclick = () => this.markImageForDeletion(btn, url);
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

      // Get existing images (excluding deleted ones)
      let existingImages = [];
      if (this.editingProductId) {
        const existingImgDivs = document.querySelectorAll('#existingImages .preview-image:not([data-delete="true"]) img');
        existingImgDivs.forEach(img => {
          existingImages.push(img.src);
        });
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
        ebayUrl: document.getElementById('productEbayUrl').value.trim(),
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
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order: ' + error.message);
    }
  },

  // View order details
  async viewOrder(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const order = orderDoc.data();
        let itemsList = '';
        if (order.items) {
          order.items.forEach(item => {
            itemsList += `- ${item.name} x ${item.quantity} @ £${item.price}\n`;
          });
        }
        alert(`Order #${orderId.slice(-6).toUpperCase()}\n\nCustomer: ${order.customerName || order.email}\nTotal: £${order.total?.toFixed(2)}\nStatus: ${order.status}\n\nItems:\n${itemsList}`);
      }
    } catch (error) {
      console.error('Error viewing order:', error);
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
