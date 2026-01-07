# DTDC Shipping Integration

This document describes the DTDC shipping and tracking integration implemented in the EcoBuy platform.

## Overview

The DTDC integration allows:
- Adding AWB (Air Waybill) numbers to orders
- Tracking shipments in real-time using DTDC's tracking API
- Displaying tracking information to both admin and customers
- Automatic tracking data caching to reduce API calls

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# DTDC API Configuration
DTDC_API_KEY=9c8276ce313799292bff9882b94d1e
DTDC_TRACKING_CREDENTIALS=GL10991_trk_json:411c5d5200239ed2241b737fa15eecc1
DTDC_ENVIRONMENT=production  # Use 'staging' for testing
```

### API Credentials

- **API Key**: `9c8276ce313799292bff9882b94d1e`
- **Tracking Credentials**: `GL10991_trk_json:411c5d5200239ed2241b737fa15eecc1`
  - Format: `username:password`
  - Username: `GL10991_trk_json`
  - Password: `411c5d5200239ed2241b737fa15eecc1`

## Architecture

### Backend Components

1. **Order Model** (`backend/models/Order.js`)
   - Added fields:
     - `awbNumber`: String - The DTDC AWB/Consignment number
     - `dtdcTrackingData`: Mixed - Cached tracking data from DTDC API
     - `trackingLastUpdated`: Date - Timestamp of last tracking data fetch

2. **DTDC Service** (`backend/services/dtdcService.js`)
   - `getAuthToken()`: Authenticates with DTDC API and returns token
   - `trackConsignment(awbNumber, includeAdditionalDetails)`: Fetches tracking data for an AWB number
   - `transformTrackingData(rawData)`: Transforms DTDC API response to standardized format
   - Token caching: Tokens are cached for 1 hour to reduce API calls

3. **DTDC Routes** (`backend/routes/dtdc.js`)
   - `POST /api/dtdc/track` - Track consignment by AWB (Admin only)
   - `PUT /api/dtdc/order/:orderId/awb` - Add/Update AWB number (Admin only)
   - `POST /api/dtdc/order/:orderId/track` - Fetch and update tracking data (Admin only)
   - `GET /api/dtdc/order/:orderId/tracking` - Get tracking data (Admin only)
   - `GET /api/dtdc/order/:orderId/tracking/customer` - Get tracking data (Customer)

### Frontend Components

1. **Admin Order Detail** (`ecommerce/components/admin/admin-order-detail.tsx`)
   - AWB number input field
   - Save AWB number button
   - Fetch tracking data button
   - Display tracking information card with:
     - AWB number, status, origin, destination
     - Tracking history timeline
     - Weight, remarks, and other details

2. **Customer Order Detail** (`ecommerce/components/order-detail-content.tsx`)
   - DTDC tracking card (shown when AWB number exists)
   - Refresh tracking button
   - Display tracking information similar to admin view
   - Tracking history timeline

## API Endpoints

### Production Endpoints
- Authentication: `https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/authenticate`
- Tracking: `https://blktracksvc.dtdc.com/dtdc-api/rest/XMLSchemaTrk/getDetails`

### Staging Endpoints
- Authentication: `http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/api/dtdc/authenticate`
- Tracking: `http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/rest/XMLSchemaTrk/getDetails`

## AWB Number Format

DTDC AWB numbers follow this format:
- **Format**: 1 alphabet character followed by 8 digits
- **Example**: `V01197967`
- **Validation**: `/^[A-Z]\d{8}$/`

## Usage

### Admin Workflow

1. Navigate to Admin → Orders → Select an order
2. In the "Shipping Information" card:
   - Enter AWB number in the format: `V01197967`
   - Click "Save" to save the AWB number
   - Click "Fetch Tracking Data" to get latest tracking information
3. Tracking information will be displayed in the "DTDC Tracking Information" card

### Customer Workflow

1. Navigate to Dashboard → Orders → Select an order
2. If an AWB number is set, a "Shipment Tracking (DTDC)" card will appear
3. Click "Fetch Tracking Data" or "Refresh" to get latest tracking information
4. View tracking history and current status

## Tracking Data Structure

The tracking data returned includes:

```javascript
{
  success: true,
  awbNumber: "V01197967",
  status: "Delivered",
  origin: "BANGALORE",
  destination: "MUMBAI",
  statusDate: "21062017",
  statusTime: "1614",
  bookedDate: "21062017",
  bookedTime: "15:30:25",
  pieces: "1",
  weight: "0.1000",
  weightUnit: "KG",
  remarks: "SIGN",
  noOfAttempts: "1",
  rtoNumber: "",
  trackingDetails: [
    {
      code: "BKD",
      action: "Booked",
      manifestNo: "",
      origin: "BANGALORE SURFACE APEX",
      destination: "",
      actionDate: "21062017",
      actionTime: "1530",
      remarks: ""
    },
    // ... more tracking events
  ]
}
```

## Caching Strategy

- **Authentication Tokens**: Cached for 1 hour
- **Tracking Data**: 
  - Cached in database when fetched
  - Fresh data fetched if cache is older than 1 hour
  - Admin can force refresh at any time
  - Customer can refresh to get latest data

## Error Handling

- Invalid AWB format validation
- API authentication failures
- Network timeouts (15 seconds)
- Invalid order IDs
- Missing AWB numbers

## Status Codes

DTDC API returns:
- `200` - Success
- `201` - Partial content (validation failed)
- `400` - Bad Request
- `401` - Unauthorized
- `500` - Error Occurred

## Testing

1. Use staging environment for testing:
   ```env
   DTDC_ENVIRONMENT=staging
   ```

2. Test with sample AWB numbers provided by DTDC

3. Verify:
   - AWB number validation
   - Authentication token retrieval
   - Tracking data fetching
   - Error handling for invalid AWB numbers

## Future Enhancements

- Automatic tracking updates via webhooks (if DTDC supports)
- Email/SMS notifications on status changes
- Bulk AWB number upload
- Integration with order shipping label generation
- Support for multiple courier partners

## Support

For DTDC API issues, refer to:
- DTDC API Documentation: `TLS DTDC REST TRACKING API_FINAL_V4.docx.pdf`
- DTDC Support: Contact DTDC technical support

## Notes

- The API parameter name is `apikev` (not `apikey`) as per DTDC documentation
- Tracking data is stored in the order document for quick access
- The system supports both JSON and XML responses (XML parsing can be added if needed)




























