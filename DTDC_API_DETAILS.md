# DTDC API Configuration Details

This document contains the API endpoints and credentials being used for DTDC tracking integration.

## Tracking API Credentials

**Username:** `GL10991_trk_json`  
**Password:** `411c5d5200239ed2241b737fa15eecc1`

**Format:** `username:password` = `GL10991_trk_json:411c5d5200239ed2241b737fa15eecc1`

## API Endpoints

### Production Environment

**Tracking Endpoint (JSON):**
```
https://blktracksvc.dtdc.com/dtdc-api/rest/XMLSchemaTrk/getDetails
```

**Authentication Endpoint:**
```
https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/authenticate
```

### Staging Environment

**Tracking Endpoint (JSON):**
```
http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/rest/XMLSchemaTrk/getDetails
```

**Authentication Endpoint:**
```
http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/api/dtdc/authenticate
```

## Authentication Methods Attempted

### Method 1: Basic Authentication (HTTP Basic Auth)
- **Type:** HTTP Basic Authentication
- **Implementation:** Sending `username:password` in the `Authorization` header
- **Headers:**
  - `Authorization: Basic <base64(username:password)>`
  - `Accept: application/json`
- **Query Parameters:**
  - `strcnno`: AWB/Consignment number (e.g., `7X109986053`)
  - `TrkType`: `cnno`
  - `addtnIDtl`: `Y` (for additional details) or `N`

**Example Request:**
```
GET https://blktracksvc.dtdc.com/dtdc-api/rest/XMLSchemaTrk/getDetails?strcnno=7X109986053&TrkType=cnno&addtnIDtl=Y
Headers:
  Authorization: Basic R0wxMDk5MV90cmtfanNvbjo0MTFjNWQ1MjAwMjM5ZWQyMjQxYjczN2ZhMTVlZWNjMQ==
  Accept: application/json
```

### Method 2: Token-Based Authentication
- **Step 1:** Get token from authentication endpoint
  - **Request:** `GET https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/authenticate?username=GL10991_trk_json&password=411c5d5200239ed2241b737fa15eecc1`
  - **Response:** Returns authentication token

- **Step 2:** Use token in tracking request
  - **Query Parameters:**
    - `strcnno`: AWB/Consignment number
    - `TrkType`: `cnno`
    - `addtnIDtl`: `Y` or `N`
    - `apikey`: <token from step 1>

**Example Request (Step 1 - Get Token):**
```
GET https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/authenticate?username=GL10991_trk_json&password=411c5d5200239ed2241b737fa15eecc1
```

**Example Request (Step 2 - Track Consignment):**
```
GET https://blktracksvc.dtdc.com/dtdc-api/rest/XMLSchemaTrk/getDetails?strcnno=7X109986053&TrkType=cnno&addtnIDtl=Y&apikey=<TOKEN>
Headers:
  Accept: application/json
```

## Current Error

**Status Code:** `403 Forbidden`  
**Error Message:** `Not Authorized`

This error occurs when attempting to:
1. Authenticate using the authentication endpoint
2. Access the tracking endpoint using Basic Authentication

## Test AWB Numbers

The following AWB numbers are being tested:
- `7X109986053`
- `7X109986051`
- `7X109986052`

## Expected Response Format (JSON)

Based on DTDC API documentation, the expected response should be:

```json
{
  "statusCode": 200,
  "statusFlag": true,
  "status": "SUCCESS",
  "errorDetails": null,
  "trackHeader": {
    "strShipmentNo": "7X109986053",
    "strStatus": "Delivered",
    "strOrigin": "...",
    "strDestination": "...",
    ...
  },
  "trackDetails": [
    {
      "strCode": "BKD",
      "strAction": "Booked",
      ...
    }
  ]
}
```

## Questions for DTDC Support

1. Are the credentials `GL10991_trk_json:411c5d5200239ed2241b737fa15eecc1` correct and active?
2. Is the endpoint `https://blktracksvc.dtdc.com/dtdc-api/rest/XMLSchemaTrk/getDetails` the correct JSON tracking endpoint?
3. Should we use Basic Authentication or Token-based authentication?
4. If using token-based auth, should the parameter be `apikey` or `apikev` (as per PDF documentation)?
5. Are there any IP whitelist requirements for these API calls?
6. Are the credentials restricted to specific AWB numbers or consignment types?

## Additional Notes

- The system first tries Basic Authentication, and if that fails, it falls back to Token-based authentication
- According to the DTDC API documentation (TLS DTDC REST TRACKING API_FINAL_V4.docx.pdf), the authentication should work via the authenticate endpoint
- The credentials were provided as: "Tracking API : GL10991_trk_json:411c5d5200239ed2241b737fa15eecc1"





