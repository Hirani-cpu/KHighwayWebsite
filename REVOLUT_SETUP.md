# Revolut Payment Integration Setup Guide

This guide will help you complete the Revolut payment integration for K Highway DIY Hardware Shop.

## Overview

Your checkout page now supports the following payment methods through Revolut:
- **Credit/Debit Card** payments
- **Apple Pay** (automatically available on compatible devices)
- **Google Pay** (automatically available on supported browsers)
- **Revolut Pay** (for Revolut app users)

## Prerequisites

1. A Revolut Business account
2. Access to the Revolut Merchant Dashboard
3. Merchant API credentials from Revolut

## Step 1: Get Your Revolut Credentials

### 1.1 Sign up for Revolut Business (if not already done)
- Visit: https://business.revolut.com/
- Sign up for a Business account
- Complete the verification process

### 1.2 Access the Merchant Dashboard
- Log in to: https://business.revolut.com/
- Navigate to **Merchant** section
- Go to **API Settings** or **Developer Settings**

### 1.3 Get Your Public API Key
- In the Merchant Dashboard, find the **API Keys** section
- Copy your **Public API Key** (starts with `pk_`)
- **Important:** Never share your Secret API Key in frontend code!

## Step 2: Update checkout.html

Open `checkout.html` and find line 468. Replace the placeholder with your actual credentials:

```javascript
// BEFORE:
const REVOLUT_PUBLIC_KEY = 'YOUR_REVOLUT_PUBLIC_KEY';
const REVOLUT_MODE = 'sandbox';

// AFTER:
const REVOLUT_PUBLIC_KEY = 'pk_your_actual_public_key_here';
const REVOLUT_MODE = 'sandbox'; // Keep as 'sandbox' for testing
```

### Testing vs Production

- **Sandbox Mode** (for testing):
  ```javascript
  const REVOLUT_MODE = 'sandbox';
  ```
  Use sandbox credentials and test card numbers

- **Production Mode** (for live payments):
  ```javascript
  const REVOLUT_MODE = 'prod';
  ```
  Use production credentials

## Step 3: Set Up Backend Order Creation

Revolut requires server-side order creation for security. You need to implement a backend endpoint.

### Option A: Using Node.js/Express

1. Install Revolut SDK:
   ```bash
   npm install @revolut/checkout
   ```

2. Create an API endpoint (`/api/create-revolut-order`):

```javascript
const express = require('express');
const Revolut = require('@revolut/checkout');

const app = express();
app.use(express.json());

// Initialize Revolut with your Secret API Key
const revolut = new Revolut({
  apiKey: 'sk_your_secret_key_here', // NEVER expose this in frontend!
  environment: 'sandbox' // or 'production'
});

app.post('/api/create-revolut-order', async (req, res) => {
  try {
    const { amount, currency, items } = req.body;

    // Create order with Revolut Merchant API
    const order = await revolut.orders.create({
      amount: amount, // Amount in smallest currency unit (pence for GBP)
      currency: currency,
      description: 'K Highway DIY Hardware Shop Order',
      merchant_order_ext_ref: 'ORDER-' + Date.now(),
      // Add customer info if needed
    });

    res.json({
      public_id: order.public_id,
      order_id: order.id
    });
  } catch (error) {
    console.error('Order creation failed:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

3. Update `checkout.html` line 472 to call your backend:

```javascript
async function createRevolutOrder() {
  const cart = Cart.getCart();
  const subtotal = Cart.getTotal();
  const shipping = getSelectedShipping();
  const total = subtotal + shipping;

  try {
    const response = await fetch('/api/create-revolut-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(total * 100), // Convert to pence
        currency: 'GBP',
        items: cart
      })
    });

    const order = await response.json();
    return order.public_id;
  } catch (error) {
    console.error('Failed to create order:', error);
    return null;
  }
}
```

### Option B: Using Firebase Cloud Functions

1. Install dependencies:
   ```bash
   cd functions
   npm install axios
   ```

2. Create a Cloud Function:

```javascript
const functions = require('firebase-functions');
const axios = require('axios');

exports.createRevolutOrder = functions.https.onCall(async (data, context) => {
  const { amount, currency } = data;

  try {
    const response = await axios.post(
      'https://sandbox-merchant.revolut.com/api/1.0/orders',
      {
        amount: amount,
        currency: currency,
        description: 'K Highway DIY Hardware Shop Order'
      },
      {
        headers: {
          'Authorization': `Bearer sk_your_secret_key_here`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      public_id: response.data.public_id,
      order_id: response.data.id
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

3. Update checkout.html to call the function:

```javascript
async function createRevolutOrder() {
  const cart = Cart.getCart();
  const subtotal = Cart.getTotal();
  const shipping = getSelectedShipping();
  const total = subtotal + shipping;

  try {
    const createOrder = firebase.functions().httpsCallable('createRevolutOrder');
    const result = await createOrder({
      amount: Math.round(total * 100),
      currency: 'GBP'
    });

    return result.data.public_id;
  } catch (error) {
    console.error('Failed to create order:', error);
    return null;
  }
}
```

## Step 4: Test Your Integration

### 4.1 Test Card Numbers (Sandbox Mode)

Use these test card numbers in sandbox mode:

- **Successful Payment:**
  - Card: `4242 4242 4242 4242`
  - Expiry: Any future date (e.g., 12/25)
  - CVV: Any 3 digits (e.g., 123)

- **Failed Payment:**
  - Card: `4000 0000 0000 0002`

- **3D Secure:**
  - Card: `4000 0000 0000 3220`

### 4.2 Testing Checklist

- [ ] Card payment works and completes successfully
- [ ] Revolut Pay button appears and functions
- [ ] Apple Pay button appears on Safari/iPhone (if supported)
- [ ] Google Pay button appears on Chrome (if supported)
- [ ] Form validation triggers before payment
- [ ] Order is saved to Firebase after successful payment
- [ ] Email notification is sent after order completion
- [ ] Cart is cleared after successful payment
- [ ] Order confirmation page displays with order ID

## Step 5: Go Live

Once testing is complete:

1. **Get Production API Keys:**
   - Log in to Revolut Business Dashboard
   - Switch to Production environment
   - Copy your production Public API Key

2. **Update checkout.html:**
   ```javascript
   const REVOLUT_PUBLIC_KEY = 'pk_prod_your_production_key_here';
   const REVOLUT_MODE = 'prod';
   ```

3. **Update Backend:**
   - Replace sandbox Secret API Key with production key
   - Update API endpoint URL from sandbox to production:
     - Sandbox: `https://sandbox-merchant.revolut.com/api/1.0/`
     - Production: `https://merchant.revolut.com/api/1.0/`

## Important Security Notes

⚠️ **NEVER expose your Secret API Key in frontend code!**
- Secret keys must ONLY be used in backend/server code
- Public keys are safe to use in frontend code
- Always use environment variables for API keys in production

## Troubleshooting

### Payment widgets not showing
- Check browser console for errors
- Verify your Public API Key is correct
- Ensure backend endpoint is accessible

### "Unable to create order" error
- Check that your backend endpoint is running
- Verify Secret API Key is correct
- Check API request/response in Network tab

### Card payment fails
- In sandbox mode, use test card numbers
- Check that form validation passes
- Verify order amount is in correct format (smallest currency unit)

## API Documentation

For detailed API documentation, visit:
- **Revolut Merchant API:** https://developer.revolut.com/docs/merchant/merchant-api
- **Revolut Web SDK:** https://developer.revolut.com/docs/sdks/merchant-web-sdk
- **Integration Examples:** https://github.com/revolut-engineering/revolut-checkout-example

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Review Revolut's documentation
3. Contact Revolut support: api-requests@revolut.com
4. Check your Revolut Dashboard for transaction logs

## Summary of Changes Made

✅ Removed PayPal SDK and payment integration
✅ Added Revolut Merchant SDK (https://merchant.revolut.com/embed.js)
✅ Implemented Card payment with embedded card field
✅ Added Revolut Pay button
✅ Added Apple Pay support (auto-detects device compatibility)
✅ Added Google Pay support
✅ Added form validation before payment
✅ Updated order data to include payment method
✅ Maintained email notification functionality

## What You Need to Provide

To complete the integration, you need:

1. **Revolut Public API Key** (`pk_...`)
2. **Revolut Secret API Key** (`sk_...`) - for backend only
3. **Backend implementation** (Node.js, Firebase Functions, or your preferred solution)

Once you have these, update:
- Line 468 in `checkout.html` with your Public API Key
- Line 472-492 in `checkout.html` with your backend endpoint
- Your backend with the Secret API Key

---

**Questions?** Refer to the Revolut documentation links above or contact their support team.
