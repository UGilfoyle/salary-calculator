# ATS Resume Checker & Premium Payment Implementation Plan

## Overview
Fix the ATS Resume Checker that was failing due to PDF parsing issues and implement a complete premium payment system with Razorpay integration.

## Problems Identified

### 1. PDF Parsing Issues
- **Current**: Using `pdf-parse` v1.1.1 with CommonJS/ESM compatibility issues
- **Problem**: Module loading failures in production (Render deployment)
- **Solution**: Use `pdfjs-dist` with dynamic `import()` for ESM compatibility

### 2. Missing Module Integration
- **Current**: ATS and Payment modules exist but not imported in `app.module.ts`
- **Problem**: Routes not accessible, entities not synced
- **Solution**: Re-add modules to app.module.ts

### 3. Premium User Tracking
- **Current**: No way to track premium users
- **Problem**: Can't gate premium features
- **Solution**: Add `isPremium` and `premiumExpiresAt` to User entity

### 4. Payment Gateway
- **Current**: Manual UPI payment flow
- **Problem**: Not scalable, requires manual verification
- **Solution**: Integrate Razorpay for automated payment processing

## Implementation Steps

### Phase 1: Fix PDF Parsing ✅
1. Install `pdfjs-dist` package
2. Update `ats.service.ts` to use dynamic import for pdfjs-dist
3. Implement proper error handling
4. Test with sample PDF files

### Phase 2: Re-integrate Modules ✅
1. Add ATS entities to TypeORM in app.module.ts
2. Add Payment entities to TypeORM in app.module.ts
3. Import AtsModule and PaymentModule
4. Verify database tables are created

### Phase 3: Premium User Tracking ✅
1. Add `isPremium: boolean` to User entity
2. Add `premiumExpiresAt: Date` to User entity
3. Create migration or update synchronize
4. Update User service to handle premium status

### Phase 4: Razorpay Integration ✅
1. Install `razorpay` package
2. Add Razorpay keys to environment variables
3. Create Razorpay order in PaymentService
4. Implement webhook for payment verification
5. Update premium status on successful payment

### Phase 5: ATS Service Premium Gating ✅
1. Update `checkAts` to check premium status
2. Gate premium features (all companies, detailed analysis)
3. Update premium enhancement endpoint
4. Add premium status check middleware

### Phase 6: Frontend ATS Checker UI ✅
1. Replace "Coming Soon" with full UI
2. Add file upload component
3. Display ATS results
4. Show premium upgrade prompts
5. Integrate Razorpay checkout

### Phase 7: Testing ✅
1. Test PDF parsing with various files
2. Test DOCX parsing
3. Test payment flow end-to-end
4. Test premium feature gating
5. Test error handling

## Technical Details

### PDF Parsing Solution
```typescript
// Use dynamic import for ESM compatibility
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
// Parse PDF using pdfjs-dist
```

### Razorpay Integration
- Order creation: `razorpay.orders.create()`
- Payment verification: Webhook + signature verification
- Premium activation: Update user on successful payment

### Premium Features
- All company comparisons (not just Goldman Sachs & Google)
- Detailed keyword analysis
- Resume optimization tips
- Keyword replacement suggestions
- Industry-specific recommendations

## Environment Variables Needed

```env
# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Payment
PREMIUM_PRICE=99  # ₹99 per resume enhancement
```

## Database Changes

1. User entity: Add `isPremium` and `premiumExpiresAt`
2. Payment entity: Already exists, may need Razorpay fields
3. ATS entities: Already exist, verify they're synced

## API Endpoints

### ATS Endpoints (existing)
- `POST /api/ats/check` - Upload and analyze resume
- `GET /api/ats/history` - Get user's check history
- `GET /api/ats/history/:id` - Get specific check
- `POST /api/ats/premium/enhance` - Get premium enhancements

### Payment Endpoints (to update)
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment (webhook)
- `GET /api/payment/status/:orderId` - Check payment status

## Frontend Components

1. **AtsChecker.tsx** - Main component with file upload
2. **AtsResults.tsx** - Display analysis results
3. **PremiumUpgrade.tsx** - Payment/upgrade modal
4. **RazorpayCheckout.tsx** - Razorpay integration component

## Success Criteria

- ✅ PDF files parse successfully without errors
- ✅ DOCX files parse successfully
- ✅ ATS analysis works correctly
- ✅ Payment flow completes successfully
- ✅ Premium features are properly gated
- ✅ Users can upgrade to premium
- ✅ Premium status persists correctly

