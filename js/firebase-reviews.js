// Firebase Reviews System
import {
  db,
  collection, doc, addDoc, updateDoc, getDocs, query, where, orderBy
} from './firebase-config.js';

const FirebaseReviews = {
  // Get reviews for a product
  async getProductReviews(productId) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting reviews:', error);
      return [];
    }
  },

  // Get user's review for a product
  async getUserReview(productId, email) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        where('email', '==', email.toLowerCase())
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error('Error getting user review:', error);
      return null;
    }
  },

  // Add review
  async addReview(reviewData) {
    try {
      // Check existing
      const existing = await this.getUserReview(reviewData.productId, reviewData.email);
      if (existing) {
        return { success: false, message: 'You already reviewed this product.', existingReview: existing };
      }

      const docRef = await addDoc(collection(db, 'reviews'), {
        productId: reviewData.productId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        author: reviewData.author,
        email: reviewData.email.toLowerCase(),
        date: new Date().toISOString(),
        verified: reviewData.verified || false
      });

      return { success: true, review: { id: docRef.id, ...reviewData } };
    } catch (error) {
      return { success: false, message: 'Failed to add review.' };
    }
  },

  // Update review
  async updateReview(reviewId, reviewData) {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        date: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Failed to update review.' };
    }
  },

  // Get average rating
  async getAverageRating(productId) {
    const reviews = await this.getProductReviews(productId);
    if (reviews.length === 0) return { average: 0, count: 0 };

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: (sum / reviews.length).toFixed(1),
      count: reviews.length
    };
  },

  // Generate stars HTML
  generateStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star">${i <= rating ? '★' : '☆'}</span>`;
    }
    return html;
  },

  // Format date
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }
};

export default FirebaseReviews;
