# Crypto Payment System - Testing Guide

## Complete End-to-End Test

### 1. **Checkout Flow**
- [ ] Go to http://mrsanabolics.com
- [ ] Add a product to cart (any item)
- [ ] Click "Cart" or go to checkout
- [ ] Fill in shipping details
- [ ] Proceed to payment section
- [ ] Select **"Cryptocurrency"** payment method
- [ ] Verify the notice shows: "Pay with Bitcoin, Ethereum or USDT. You will be redirected to complete payment securely."

### 2. **Payment Button Click**
- [ ] Click **"Pay with BTC"** button
- [ ] Verify you're redirected to: `/checkout/payment-confirmation?order=MRA-XXXXX`
- [ ] Page should load without errors

### 3. **Payment Confirmation Page Display**
Check that the page shows:
- [ ] **Order ID** (MRA-XXXXX format)
- [ ] **"Waiting for Payment"** status with clock icon
- [ ] **Amount to Send** in BTC (e.g., 0.00290453 BTC)
- [ ] **Send to Address** - a Bitcoin wallet address (starts with 1, 3, or bc1)
- [ ] **Copy button** next to the address
- [ ] **Instructions** (4 steps listed)
- [ ] **Order Summary** showing total amount in USD

### 4. **Copy to Clipboard**
- [ ] Click the **"Copy"** button next to the wallet address
- [ ] Button should show **"Copied!"** for 2 seconds
- [ ] Address should be copied to clipboard (test by pasting)

### 5. **Real-Time Status Polling**
- [ ] Leave the page open
- [ ] Open NOWPayments dashboard in another tab
- [ ] Look for the payment in your **Payments history**
- [ ] Verify the payment shows:
  - Order ID: MRA-XXXXX
  - Amount: matching the checkout amount
  - Status: **Waiting**
  - Payin address: matches what's shown on page

### 6. **Complete a Test Payment (Optional)**
If you want to test the full payment flow:
- [ ] Send the exact BTC amount to the wallet address shown
  - OR use a test transaction tool
  - OR check if NOWPayments has a test mode
- [ ] Monitor the payment status in NOWPayments dashboard
- [ ] Payment should change to **"Confirmed"** or received status

### 7. **Webhook Confirmation (if payment made)**
- [ ] Once payment is confirmed in NOWPayments:
  - [ ] Page should auto-detect the payment (polls every 3 seconds)
  - [ ] Status should change to **"Payment Received!"** with green checkmark
  - [ ] Page should auto-redirect to `/checkout/success?order=MRA-XXXXX`
  - [ ] Order status in database should update to **CONFIRMED**

### 8. **Test Other Crypto Options**
- [ ] Go back to checkout
- [ ] Add item to cart
- [ ] Try **"Pay with ETH"** button
  - Should work same as BTC
  - Should show amount in ETH
- [ ] Try **"Pay with USDT"** button
  - If account not enabled: should show error "not allowed"
  - If enabled: should show amount in USDT

### 9. **Error Handling**
- [ ] Try accessing payment-confirmation with invalid order ID
  - Should show "Payment Error" message
- [ ] Check browser console for any JavaScript errors
  - Should be clean or only non-critical warnings

### 10. **NOWPayments Dashboard Verification**
- [ ] Open https://dashboard.nowpayments.io/payments
- [ ] Look for all test payments
- [ ] Each should show:
  - [ ] Payment ID
  - [ ] Order ID (MRA-XXXXX)
  - [ ] Amount in USD
  - [ ] Amount in crypto (BTC/ETH/USDT)
  - [ ] Status (Waiting or Confirmed)
  - [ ] Payin address
  - [ ] Created timestamp

## Summary Checklist

**Payment Creation:**
- [ ] Payment created in NOWPayments
- [ ] Order created in database with status NEW
- [ ] Payment ID stored in order notes

**Payment Confirmation Page:**
- [ ] Page loads without errors
- [ ] Shows correct order and payment details
- [ ] Copy button works
- [ ] Polling for status every 3 seconds

**Payment Processing:**
- [ ] Webhook receives payment callback
- [ ] Order status updates to CONFIRMED
- [ ] Page detects update and shows success
- [ ] Auto-redirect works

## Known Limitations

- USDT may require additional account setup in NOWPayments
- Payment confirmation may take 5-10+ minutes depending on blockchain
- Test payments may have NOWPayments rate limits

## Next Steps if Issues Found

1. Check browser console for errors
2. Check NOWPayments dashboard to verify payment was created
3. Check order in database to verify it was created
4. Check webhook logs to verify callback was received

