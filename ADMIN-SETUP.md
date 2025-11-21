# K Highway DIY Hardware Shop - Admin Setup Guide

## Master Admin Account Setup

### Step 1: Create the Admin User in Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **k-highway-diy-hardware-shop**
3. Navigate to **Authentication** > **Users**
4. Click **Add user**
5. Enter the following details:
   - Email: `info@khighwaywd.co.uk`
   - Password: (Choose a strong password - you'll need this to login)
6. Click **Add user**
7. **Copy the User UID** (you'll need this for the next step)

### Step 2: Create the Admin User Document in Firestore

1. In Firebase Console, navigate to **Firestore Database**
2. Click **Start collection** (if this is your first collection)
3. Create the **users** collection if it doesn't exist
4. Click **Add document**
5. For **Document ID**, paste the **User UID** you copied from Step 1
6. Add the following fields:

| Field Name | Type | Value |
|------------|------|-------|
| email | string | info@khighwaywd.co.uk |
| name | string | KHighway |
| role | string | masterAdmin |
| createdAt | timestamp | (click the timestamp icon) |

7. Click **Save**

### Step 3: Enable Firebase Storage

1. In Firebase Console, navigate to **Storage**
2. Click **Get started**
3. Choose **Start in production mode**
4. Select your preferred location (europe-west2 for UK)
5. Click **Done**

### Step 4: Deploy Security Rules

#### Option A: Using Firebase CLI

1. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project directory:
   ```bash
   cd "C:\Users\visha\OneDrive\Desktop\K Highway Website"
   firebase init
   ```
   - Select **Firestore** and **Storage**
   - Select your project
   - Use default settings

4. Deploy both Firestore and Storage rules:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

#### Option B: Deploy Rules via Firebase Console

**Firestore Rules:**
1. Go to **Firestore Database** > **Rules**
2. Copy the contents of `firestore.rules` file
3. Paste into the rules editor
4. Click **Publish**

**Storage Rules:**
1. Go to **Storage** > **Rules**
2. Copy the contents of `storage.rules` file
3. Paste into the rules editor
4. Click **Publish**

## Accessing the Admin Dashboard

1. Start your local server:
   ```bash
   python -m http.server 8000
   ```

2. Navigate to: `http://localhost:8000/admin.html`

3. Login with:
   - Email: `info@khighwaywd.co.uk`
   - Password: (the password you set in Step 1)

## Admin Permissions

### Master Admin (role: masterAdmin)
- Full access to all features
- Add, edit, delete products
- Manage categories
- Update order status
- View all users
- Modify store settings
- Access all Firestore collections

### Regular Admin (role: admin)
- View products, categories, orders
- Update order status
- View users (read-only)
- Cannot modify products or settings

### Regular User (role: user)
- No access to admin dashboard
- Can only view their own orders and profile

## Security Notes

1. **Never store passwords in code** - Always use Firebase Authentication
2. **Keep your Firebase config secure** - Don't expose sensitive keys
3. **Use Firestore rules** - The provided rules restrict access based on user roles
4. **Audit logs** - All admin actions are timestamped with updatedBy field

## Troubleshooting

### "Access Denied" on admin page
- Ensure the user has `role: masterAdmin` in Firestore
- Check that the document ID matches the Firebase Auth UID exactly
- Verify Firestore rules are deployed

### Cannot save products/settings
- Only masterAdmin can perform write operations
- Check browser console for specific error messages
- Verify Firestore rules are properly deployed

### Products not showing
- Products must be added to the `products` collection in Firestore
- The admin panel reads from Firestore, not from HTML files

## Adding More Admins

To add another admin:

1. Have them sign up normally on the website
2. Find their UID in Firebase Authentication
3. Update their user document in Firestore:
   - Change `role` from `user` to `admin` (or `masterAdmin`)

**Important:** Only the masterAdmin can promote users to admin roles through the Firestore console or by having special admin functions.

## Collections Structure

```
users/
  {userId}/
    email: string
    name: string
    role: "user" | "admin" | "masterAdmin"
    createdAt: timestamp

products/
  {productId}/
    name: string
    price: number
    oldPrice: number
    category: string
    sku: string
    imageFolder: string
    ebayUrl: string
    description: string
    updatedAt: timestamp
    updatedBy: string (userId)

categories/
  {categoryId}/
    name: string
    slug: string
    icon: string
    description: string
    productCount: number

orders/
  {orderId}/
    userId: string
    customerName: string
    email: string
    items: array
    total: number
    status: string
    createdAt: timestamp
    updatedAt: timestamp

config/
  store/
    storeName: string
    email: string
    phone: string
    currency: string
    address: string
```
