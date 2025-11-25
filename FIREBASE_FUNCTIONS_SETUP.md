# Firebase Functions Setup for Revolut Payments

## What I've Set Up For You

✅ **Created Firebase Functions structure:**
- `functions/` folder with all necessary files
- `functions/index.js` - Cloud Function for creating Revolut orders
- `functions/package.json` - Dependencies configuration
- Updated `firebase.json` to include Functions

✅ **Installed dependencies:**
- firebase-functions
- firebase-admin
- axios (for Revolut API calls)

✅ **Updated checkout.html:**
- Integrated Firebase Cloud Function call for order creation
- Your Revolut Public API Key is already configured ✅

## What You Need to Do

### Step 1: Add Your Revolut Secret API Key

1. Open the file: `functions/index.js`
2. Find line 8:
   ```javascript
   const REVOLUT_SECRET_KEY = 'YOUR_REVOLUT_SECRET_KEY';
   ```
3. Replace `'YOUR_REVOLUT_SECRET_KEY'` with your actual Revolut Secret API Key

   **To get your Secret Key:**
   - Go to: https://business.revolut.com/
   - Navigate to **Merchant** → **API Settings**
   - Copy your **Secret API Key** (starts with `sk_`)
   - ⚠️ **IMPORTANT:** Keep this secret! Never share it or commit it to public repositories

### Step 2: Deploy Firebase Functions

Open your terminal/command prompt in the project folder and run:

```bash
cd "C:\Users\visha\OneDrive\Desktop\K Highway Website"
firebase deploy --only functions
```

**Expected output:**
```
✔  Deploy complete!

Functions deployed:
- createRevolutOrder(region)
```

### Step 3: Test the Integration

1. Open your website in a browser
2. Add items to cart and go to checkout
3. Fill in all required fields
4. Try making a payment using:
   - **Test Card:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., 12/25)
   - **CVV:** Any 3 digits (e.g., 123)

5. Check browser console for logs:
   - Should see: "Revolut order created: ORDER_ID"
   - Should NOT see: "Unable to create order"

### Step 4: Verify Everything Works

After successful payment, verify:
- ✅ Cart is cleared
- ✅ Order confirmation page appears with Order ID
- ✅ Order is saved to Firebase Firestore
- ✅ Email notification is sent to info@khighwaywd.co.uk
- ✅ Customer can see order in their account (if logged in)

## Troubleshooting

### Error: "Failed to create order"

**Cause:** Secret API Key not configured
**Solution:** Add your Revolut Secret Key in `functions/index.js` line 8

### Error: "Functions not deployed"

**Cause:** Functions not deployed to Firebase
**Solution:** Run `firebase deploy --only functions`

### Error: "Insufficient permissions"

**Cause:** Firebase project not configured correctly
**Solution:** Make sure you're logged into Firebase CLI:
```bash
firebase login
firebase use --add
```
Select your Firebase project from the list.

### Payment buttons not showing

**Cause:** Public Key not configured
**Solution:** Your Public Key is already configured in `checkout.html` line 468 ✅

### Sandbox vs Production

**Currently in Sandbox Mode:**
- `checkout.html` line 469: `const REVOLUT_MODE = 'sandbox';`
- `functions/index.js` line 9: Uses sandbox URL

**To Go Live (Production):**

1. **Update checkout.html:**
   ```javascript
   const REVOLUT_MODE = 'prod';
   ```

2. **Update functions/index.js:**
   ```javascript
   const REVOLUT_API_URL = 'https://merchant.revolut.com/api/1.0/orders';
   ```

3. **Replace API Keys with Production Keys**

4. **Redeploy:**
   ```bash
   firebase deploy --only functions
   ```

## Command Reference

### Deploy Functions
```bash
firebase deploy --only functions
```

### View Function Logs
```bash
firebase functions:log
```

### Test Functions Locally (Emulator)
```bash
cd functions
npm run serve
```

### View All Deployed Functions
```bash
firebase functions:list
```

## Security Notes

⚠️ **CRITICAL:**
- **NEVER** put your Secret API Key in `checkout.html` or any frontend file
- **ONLY** the Public Key (`pk_...`) goes in the frontend
- Secret Key (`sk_...`) stays in `functions/index.js` and is only executed on Firebase servers
- Add `.env` files to `.gitignore` if you use them
- Review Firebase security rules regularly

## Costs

Firebase Functions free tier includes:
- 2 million invocations/month
- 400,000 GB-seconds of compute time/month

For a small e-commerce site, this should be **FREE**.

If you exceed the free tier:
- $0.40 per million invocations
- $0.0000025 per GB-second

**Estimated cost:** $0-5/month for most small shops

## What Happens When a Customer Pays

1. Customer fills out checkout form
2. Customer clicks payment button (Card/Apple Pay/Google Pay/Revolut Pay)
3. `createRevolutOrder()` function is called
4. Firebase Cloud Function creates order with Revolut API
5. Revolut returns a secure payment token
6. Payment widget loads with the token
7. Customer completes payment securely through Revolut
8. On success, order is saved to Firestore
9. Email notification is sent to you
10. Customer sees confirmation page

## Support

- **Revolut API Docs:** https://developer.revolut.com/docs/merchant/merchant-api
- **Firebase Functions Docs:** https://firebase.google.com/docs/functions
- **Your Functions Dashboard:** https://console.firebase.google.com/ → Functions

---

## Quick Start Summary

1. ✅ Functions folder created
2. ✅ Dependencies installed
3. ✅ Cloud Function written
4. ✅ checkout.html updated
5. ✅ Public Key configured
6. ⏳ **YOU DO:** Add Secret Key to `functions/index.js` line 8
7. ⏳ **YOU DO:** Run `firebase deploy --only functions`
8. ⏳ **YOU DO:** Test payment with card `4242 4242 4242 4242`

That's it! Your payment system will be live and fully functional. 🎉
