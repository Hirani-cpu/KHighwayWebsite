// Reviews System for DIY Hardware Shop

const Reviews = {
  // Storage key
  REVIEWS_KEY: 'diyHardwareReviews',

  // Get all reviews
  getAllReviews() {
    return JSON.parse(localStorage.getItem(this.REVIEWS_KEY) || '[]');
  },

  // Save reviews
  saveReviews(reviews) {
    localStorage.setItem(this.REVIEWS_KEY, JSON.stringify(reviews));
  },

  // Get reviews for a specific product
  getProductReviews(productId) {
    const allReviews = this.getAllReviews();
    return allReviews.filter(review => review.productId === productId);
  },

  // Check if user already reviewed this product
  getUserReview(productId, email) {
    const reviews = this.getProductReviews(productId);
    return reviews.find(r => r.email.toLowerCase() === email.toLowerCase());
  },

  // Add a new review
  addReview(reviewData) {
    const reviews = this.getAllReviews();

    // Check if user already reviewed this product
    const existingReview = this.getUserReview(reviewData.productId, reviewData.email);
    if (existingReview) {
      return { success: false, message: 'You have already reviewed this product. You can edit your existing review.', existingReview: existingReview };
    }

    const newReview = {
      id: Date.now().toString(),
      productId: reviewData.productId,
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      author: reviewData.author,
      email: reviewData.email,
      date: new Date().toISOString(),
      verified: reviewData.verified || false
    };

    reviews.push(newReview);
    this.saveReviews(reviews);

    return { success: true, review: newReview };
  },

  // Update existing review
  updateReview(reviewId, reviewData) {
    const reviews = this.getAllReviews();
    const index = reviews.findIndex(r => r.id === reviewId);

    if (index === -1) {
      return { success: false, message: 'Review not found.' };
    }

    reviews[index] = {
      ...reviews[index],
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      date: new Date().toISOString()
    };

    this.saveReviews(reviews);
    return { success: true, review: reviews[index] };
  },

  // Get average rating for a product
  getAverageRating(productId) {
    const reviews = this.getProductReviews(productId);
    if (reviews.length === 0) return { average: 0, count: 0 };

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
      average: (sum / reviews.length).toFixed(1),
      count: reviews.length
    };
  },

  // Generate star HTML
  generateStars(rating, interactive = false) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (interactive) {
        html += `<span class="star" data-rating="${i}">${i <= rating ? '★' : '☆'}</span>`;
      } else {
        html += `<span class="star">${i <= rating ? '★' : '☆'}</span>`;
      }
    }
    return html;
  },

  // Format date
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
};
