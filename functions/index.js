const functions = require('firebase-functions');
const axios = require('axios');

// ============================================================
// REVOLUT ORDER CREATION CLOUD FUNCTION
// ============================================================
// TODO: Add your Revolut Secret API Key here (NEVER expose this in frontend!)
const REVOLUT_SECRET_KEY = 'sk_uVRhIXrLP_mVviLhi6aIT3UFKopsZq6w4mk9AEXcyfqna--dH2Jy3SOC9cdeAA5F'; // Replace with your actual secret key
const REVOLUT_API_URL = 'https://sandbox-merchant.revolut.com/api/1.0/orders'; // Use sandbox for testing

// Change to production URL when going live:
// const REVOLUT_API_URL = 'https://merchant.revolut.com/api/1.0/orders';

/**
 * Cloud Function to create a Revolut order
 * This must be called from the frontend before initiating payment
 */
exports.createRevolutOrder = functions.https.onCall(async (data, context) => {
  try {
    console.log('Received data:', JSON.stringify(data));
    console.log('Data keys:', Object.keys(data));
    console.log('Amount:', data.amount);
    console.log('Currency:', data.currency);

    const {amount, currency, items, customerEmail} = data;

    // Validate input
    if (!amount || !currency) {
      console.error('Validation failed - amount:', amount, 'currency:', currency);
      throw new functions.https.HttpsError('invalid-argument', 'Amount and currency are required');
    }

    if (amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Amount must be greater than 0');
    }

    // Create order with Revolut Merchant API
    const orderData = {
      amount: amount, // Amount in smallest currency unit (pence for GBP)
      currency: currency,
      description: 'K Highway DIY Hardware Shop Order',
      merchant_order_ext_ref: 'ORDER-' + Date.now(),
      // Optional: Add customer email if provided
      ...(customerEmail && {
        customer_email: customerEmail
      })
    };

    console.log('Creating Revolut order:', orderData);

    const response = await axios.post(
      REVOLUT_API_URL,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${REVOLUT_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Revolut order created successfully:', response.data.id);

    // Return the public_id (token) needed for frontend payment widget
    return {
      success: true,
      public_id: response.data.public_id,
      order_id: response.data.id,
      amount: response.data.amount,
      currency: response.data.currency
    };

  } catch (error) {
    console.error('Failed to create Revolut order:', error.response?.data || error.message);

    // Handle Revolut API errors
    if (error.response) {
      throw new functions.https.HttpsError(
        'internal',
        `Revolut API error: ${error.response.data?.message || error.response.statusText}`
      );
    }

    // Handle other errors
    throw new functions.https.HttpsError('internal', `Failed to create order: ${error.message}`);
  }
});
