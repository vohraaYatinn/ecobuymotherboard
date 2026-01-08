# GST Invoice Implementation

This document describes the GST invoice system implemented for the EcoBuy platform.

## Overview

The system implements state-based GST calculation and invoice generation as per Indian tax regulations:
- **Intra-State (Telangana)**: CGST 9% + SGST 9% = 18% total
- **Inter-State (Other states)**: IGST 18%

## GST Calculation Rules

1. **Taxable Amount**: Product Price + Shipping/Handling Charges (₹125)
2. **Telangana Customers**:
   - CGST: 9% of taxable amount
   - SGST: 9% of taxable amount
   - Both displayed separately
3. **Other States**:
   - IGST: 18% of taxable amount
   - Only IGST displayed

## Implementation Details

### 1. Order Model Updates (`backend/models/Order.js`)

Added fields:
- `shippingState`: State where order is being shipped
- `cgst`: CGST amount (for Telangana)
- `sgst`: SGST amount (for Telangana)
- `igst`: IGST amount (for other states)
- `invoiceNumber`: Sequential invoice number (10 digits with leading zeros)

### 2. Order Creation Logic (`backend/routes/orders.js`)

- Shipping charges fixed at ₹125 (as per requirements)
- GST calculated automatically based on shipping address state
- Invoice number generated sequentially (0000000001, 0000000002, etc.)
- Total includes: Subtotal + Shipping + GST

### 3. Checkout UI (`ecommerce/components/checkout-content.tsx`)

- Displays GST breakdown based on selected address
- Shows CGST + SGST for Telangana addresses
- Shows IGST for other states
- Updates dynamically when address is selected/changed

### 4. Invoice Generation Service (`backend/services/invoiceService.js`)

PDF invoice generation includes:
- Company information (elecobuy)
- Bill To and Ship To addresses
- Invoice details (number, date, order number)
- Product table with quantities and prices
- Subtotal, Shipping, GST breakdown, and Total
- Proper formatting matching invoice examples

### 5. Invoice Download Routes (`backend/routes/invoices.js`)

- `GET /api/invoices/:orderId/download` - Customer invoice download
- `GET /api/invoices/:orderId/download/admin` - Admin invoice download

### 6. Frontend Integration

**Customer Order Detail** (`ecommerce/components/order-detail-content.tsx`):
- Download Invoice button in header
- GST breakdown displayed in order summary
- Shows CGST/SGST or IGST based on order state

**Admin Order Detail** (`ecommerce/components/admin/admin-order-detail.tsx`):
- Download Invoice button (left side)
- Can download invoice for any order

## Invoice Format

The generated PDF invoice includes:

```
INVOICE

elecobuy

Bill to: [Customer Name and Address]
Ship to: [Shipping Address]
From: [Company Address with GSTIN]

Invoice no: 0000011515
Invoice date: 11-21-2025
Order no: ORD-...
Order date: 11-21-2025
Payment method: Cash on delivery

[Product Table]
S.No | Product | Quantity | Unit price | Total price

Subtotal: ₹2,000.00
Shipping: ₹125.00 via Shipping/ Handling Charges
CGST: ₹191.25 (for Telangana)
SGST: ₹191.25 (for Telangana)
OR
IGST: ₹382.50 (for other states)
Total: ₹2,507.50
```

## Company Information

Currently hardcoded in `invoiceService.js`:
- **Name**: elecobuy
- **Address**: H N O 3-122/6, Chengicherla Road, Besides Growel Feed Supplements and Mineral Mixtures, Boudha Nagar, Hyderabad, Medchal Malkajgiri, Telangana, 500098
- **GSTIN**: 36AAHCE5719J1ZD
- **Phone**: 86399 79558

*Note: This can be moved to environment variables or database for easier updates.*

## Usage

### For Customers

1. Place an order with shipping address
2. GST is automatically calculated based on state
3. View order details
4. Click "Download Invoice" button
5. PDF invoice is downloaded

### For Admins

1. Navigate to Admin → Orders → Select order
2. Click "Download Invoice" button (left side)
3. PDF invoice is downloaded

## Example Calculations

### Telangana Order (Intra-State)
- Subtotal: ₹2,000.00
- Shipping: ₹125.00
- Taxable Amount: ₹2,125.00
- CGST (9%): ₹191.25
- SGST (9%): ₹191.25
- **Total: ₹2,507.50**

### Other State Order (Inter-State)
- Subtotal: ₹2,000.00
- Shipping: ₹125.00
- Taxable Amount: ₹2,125.00
- IGST (18%): ₹382.50
- **Total: ₹2,507.50**

## Technical Notes

- Invoice numbers are sequential and unique
- GST calculation uses `Math.round()` for precision
- PDF generation uses `pdfkit` library
- Invoices are generated on-demand (not stored)
- All amounts displayed with 2 decimal places
- Indian number formatting (₹ symbol, comma separators)

## Future Enhancements

- Store company information in database
- Email invoices automatically
- Invoice number generation with year prefix
- Multiple invoice formats/templates
- GST reports and analytics
- Export invoices in bulk





























