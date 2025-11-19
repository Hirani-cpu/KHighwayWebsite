// Firebase Orders System
import {
  db,
  collection, addDoc, getDocs, query, where, orderBy
} from './firebase-config.js';

const FirebaseOrders = {
  // Save order
  async saveOrder(orderData) {
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        orderId: orderData.orderId,
        userEmail: orderData.userEmail.toLowerCase(),
        date: new Date().toISOString(),
        total: orderData.total,
        status: 'confirmed',
        deliveryMethod: orderData.deliveryMethod,
        deliveryInstructions: orderData.deliveryInstructions || '',
        items: orderData.items,
        shipping: {
          firstName: orderData.firstName,
          lastName: orderData.lastName,
          address: orderData.address,
          address2: orderData.address2 || '',
          city: orderData.city,
          postcode: orderData.postcode,
          country: orderData.country,
          phone: orderData.phone
        }
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving order:', error);
      return { success: false };
    }
  },

  // Get user orders
  async getUserOrders(email) {
    try {
      const q = query(
        collection(db, 'orders'),
        where('userEmail', '==', email.toLowerCase()),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }
};

export default FirebaseOrders;
