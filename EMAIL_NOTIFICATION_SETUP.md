# Email Notification Setup Guide

This guide will help you set up email notifications so you receive an email whenever someone makes a purchase on your website.

## Step 1: Create EmailJS Account

1. Go to https://www.emailjs.com/
2. Click "Sign Up" and create a free account
3. Verify your email address

## Step 2: Add Email Service

1. In your EmailJS dashboard, click "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail recommended):
   - For Gmail: Click "Gmail"
   - Click "Connect Account" and sign in with your Gmail account
   - Give it a name like "K Highway Store"
4. Click "Create Service"
5. **Copy the Service ID** - you'll need this later

## Step 3: Create Email Template

1. Go to "Email Templates" in the sidebar
2. Click "Create New Template"
3. Use this template:

**Template Name:** New Order Notification

**Subject:** 🛒 New Order #{{order_id}} - {{customer_name}}

**Content:**
```
New Order Received!

Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: {{order_id}}
Date: {{order_date}}
Total Amount: {{total_amount}}

Customer Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: {{customer_name}}
Email: {{customer_email}}
Phone: {{customer_phone}}

Delivery Address:
{{customer_address}}

Delivery Method: {{delivery_method}}

Items Ordered ({{items_count}} items):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{items_details}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please log in to your admin panel to process this order.
```

4. Click "Save"
5. **Copy the Template ID** - you'll need this later

## Step 4: Get Your Public Key

1. Go to "Account" → "General" in the sidebar
2. Find your **Public Key** section
3. **Copy the Public Key** - you'll need this

## Step 5: Update Your Website Code

1. Open the file: `checkout.html`
2. Find this line (around line 334):
   ```javascript
   emailjs.init("YOUR_PUBLIC_KEY");
   ```
3. Replace `YOUR_PUBLIC_KEY` with your actual Public Key from Step 4

4. Find this line (around line 341):
   ```javascript
   await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
   ```
5. Replace `YOUR_SERVICE_ID` with your Service ID from Step 2
6. Replace `YOUR_TEMPLATE_ID` with your Template ID from Step 3

7. Verify the email address on line 342:
   ```javascript
   to_email: "info@khighwaywd.co.uk",
   ```
   This should be the email where you want to receive notifications.

## Step 6: Test the Notifications

1. Save all changes
2. Go to your website's checkout page
3. Make a test purchase
4. Check your email - you should receive the order notification!

## Example Configuration

After completing all steps, your code should look like this:

```javascript
// Initialize EmailJS
(function() {
  emailjs.init("abcd1234XYZ"); // Your actual Public Key
})();

// Function to send order notification email
async function sendOrderNotification(orderData) {
  try {
    await emailjs.send("service_xyz123", "template_abc456", {
      to_email: "info@khighwaywd.co.uk",
      // ... rest of the parameters
    });
  }
}
```

## Troubleshooting

**Not receiving emails?**
- Check your spam/junk folder
- Verify all IDs are correct (Public Key, Service ID, Template ID)
- Make sure your EmailJS account is verified
- Check the browser console for errors

**EmailJS free plan limits:**
- 200 emails per month
- If you need more, upgrade to a paid plan at https://www.emailjs.com/pricing

## Need Help?

If you encounter any issues, contact EmailJS support at https://www.emailjs.com/docs/
