import axios from "axios"

// DTDC configuration - using your provided credentials and URLs
const DTDC_CONFIG = {
  // API key used for Order Upload API (B2C / Express) - header: api-key
  apiKey: "9c8276ce313799292bff9882b94d1e",

  // Tracking credentials (username:password) for tracking API
  trackingCredentials: "GL10991_trk_json:411c5d5200239ed2241b737fa15eecc1",

  staging: {
    authenticate: "http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/api/dtdc/authenticate",
    track: "http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/rest/XMLSchemaTrk/getDetails",
    serviceability: "http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/rest/pincode-serviceability",
  },
  production: {
    authenticate: "https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/authenticate",
    track: "https://blktracksvc.dtdc.com/dtdc-api/rest/XMLSchemaTrk/getDetails",
    serviceability: "https://blktracksvc.dtdc.com/dtdc-api/rest/XMLSchemaTrk/getDetails", // placeholder for pincode service
  },

  // environment: "production" or "staging"
  environment: process.env.DTDC_ENVIRONMENT || "production",
}

// Simple auth token cache for tracking API
let authTokenCache = {
  token: null,
  expiresAt: null,
}

export async function getAuthToken() {
  if (authTokenCache.token && authTokenCache.expiresAt && new Date() < authTokenCache.expiresAt) {
    return authTokenCache.token
  }

  const [username, password] = DTDC_CONFIG.trackingCredentials.split(":")
  const baseUrl =
    DTDC_CONFIG.environment === "staging"
      ? DTDC_CONFIG.staging.authenticate
      : DTDC_CONFIG.production.authenticate

  const response = await axios.get(baseUrl, {
    params: { username, password },
    timeout: 10000,
  })

  if (response.status !== 200 || !response.data) {
    throw new Error(`DTDC auth failed with status ${response.status}`)
  }

  const token =
    typeof response.data === "string" ? response.data.trim() : response.data.token || String(response.data)

  authTokenCache.token = token
  authTokenCache.expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  return token
}

export async function trackConsignment(awbNumber, includeAdditionalDetails = true) {
  if (!awbNumber || typeof awbNumber !== "string") {
    throw new Error("AWB number is required")
  }

  const cleanAWB = awbNumber.trim().toUpperCase()
  if (!/^[A-Z]\d{8}$/.test(cleanAWB)) {
    throw new Error("Invalid AWB number format. Expected: 1 alphabet + 8 digits, e.g. V01197967")
  }

  const token = await getAuthToken()
  const baseUrl =
    DTDC_CONFIG.environment === "staging" ? DTDC_CONFIG.staging.track : DTDC_CONFIG.production.track

  const response = await axios.get(baseUrl, {
    params: {
      strcnno: cleanAWB,
      TrkType: "cnno",
      addtnIDtl: includeAdditionalDetails ? "Y" : "N",
      apikev: token,
    },
    timeout: 15000,
    headers: { Accept: "application/json" },
  })

  if (response.status !== 200) {
    throw new Error(`DTDC tracking failed with status ${response.status}`)
  }

  const raw = response.data
  return transformTrackingData(raw)
}

export function transformTrackingData(rawData) {
  try {
    if (rawData.trackHeader && rawData.trackDetails) {
      const h = rawData.trackHeader
      return {
        success: true,
        statusCode: rawData.statusCode || 200,
        status: rawData.status || "SUCCESS",
        awbNumber: h.strShipmentNo || null,
        referenceNumber: h.strRefNo || null,
        statusText: h.strStatus || null,
        statusDate: h.strStatusTransOn || null,
        statusTime: h.strStatusTransTime || null,
        origin: h.strOrigin || null,
        destination: h.strDestination || null,
        bookedDate: h.strBookedDate || null,
        bookedTime: h.strBookedTime || null,
        pieces: h.strPieces || null,
        weight: h.strWeight || null,
        weightUnit: h.strWeightUnit || null,
        remarks: h.strRemarks || null,
        noOfAttempts: h.strNoOfAttempts || null,
        rtoNumber: h.strRtoNumber || null,
        trackingDetails: (rawData.trackDetails || []).map((d) => ({
          code: d.strCode,
          action: d.strAction,
          manifestNo: d.strManifestNo || "",
          origin: d.strOrigin || "",
          destination: d.strDestination || "",
          actionDate: d.strActionDate || "",
          actionTime: d.strActionTime || "",
          remarks: d.sTrRemarks || d.strRemarks || "",
        })),
        rawData,
      }
    }

    // fallback: just wrap raw
    return {
      success: true,
      rawData,
    }
  } catch (err) {
    return {
      success: false,
      error: err.message,
      rawData,
    }
  }
}

// Simple pincode check stub – uses existing tracking endpoint as placeholder
export async function checkPincodeServiceability(pincode, originPincode) {
  const clean = (pincode || "").trim().replace(/\s+/g, "")
  if (!/^\d{6}$/.test(clean)) {
    return {
      success: false,
      serviceable: false,
      pincode: clean,
      message: "Invalid pincode format",
    }
  }

  // For now assume serviceable and estimate days by region
  const firstDigit = parseInt(clean[0], 10)
  let estimatedDays = 5
  if (firstDigit === 1 || firstDigit === 2) estimatedDays = 3
  else if (firstDigit === 3 || firstDigit === 4) estimatedDays = 4
  else if (firstDigit === 7) estimatedDays = 6

  return {
    success: true,
    serviceable: true,
    pincode: clean,
    estimatedDays,
    deliveryCharges: null,
    message: "Delivery available to this pincode",
    fallback: true,
  }
}

export function clearAuthCache() {
  authTokenCache.token = null
  authTokenCache.expiresAt = null
}

// Stub for auto-sync shipment creation. Does nothing yet, avoids breaking vendor flow.
export async function createShipmentForOrder(order) {
  console.log("[DTDC] createShipmentForOrder stub called for order", order && order.orderNumber)
  return {
    awbNumber: null,
    trackingData: null,
  }
}

export { DTDC_CONFIG }


