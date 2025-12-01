import axios from "axios"

// DTDC API Configuration
const DTDC_CONFIG = {
  // API Key for general operations
  apiKey: process.env.DTDC_API_KEY || "9c8276ce313799292bff9882b94d1e",
  
  // Tracking API credentials (format: username:password)
  trackingCredentials: process.env.DTDC_TRACKING_CREDENTIALS || "GL10991_trk_json:411c5d5200239ed2241b737fa15eecc1",
  
  // API Endpoints
  staging: {
    authenticate: "http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/api/dtdc/authenticate",
    track: "http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/rest/XMLSchemaTrk/getDetails",
    serviceability: "http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/rest/pincode-serviceability",
  },
  production: {
    authenticate: "https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/authenticate",
    track: "https://blktracksvc.dtdc.com/dtdc-api/rest/XMLSchemaTrk/getDetails",
    serviceability: "https://blktracksvc.dtdc.com/dtdc-api/rest/pincode-serviceability",
  },
  
  // Use production by default, set to 'staging' for testing
  environment: process.env.DTDC_ENVIRONMENT || "production",
}

// Cache for authentication tokens (to avoid repeated auth calls)
let authTokenCache = {
  token: null,
  expiresAt: null,
}

/**
 * Get authentication token from DTDC API
 * @returns {Promise<string>} Authentication token
 */
async function getAuthToken() {
  try {
    // Check if we have a valid cached token
    if (authTokenCache.token && authTokenCache.expiresAt && new Date() < authTokenCache.expiresAt) {
      return authTokenCache.token
    }

    const [username, password] = DTDC_CONFIG.trackingCredentials.split(":")
    const baseUrl = DTDC_CONFIG.environment === "staging" 
      ? DTDC_CONFIG.staging.authenticate 
      : DTDC_CONFIG.production.authenticate

    const response = await axios.get(baseUrl, {
      params: {
        username: username,
        password: password,
      },
      timeout: 10000, // 10 second timeout
    })

    if (response.status === 200 && response.data) {
      // Token is returned as plain text or in response data
      const token = typeof response.data === "string" ? response.data.trim() : response.data.token || response.data
      
      // Cache the token for 1 hour (tokens typically last longer, but we refresh after 1 hour)
      authTokenCache.token = token
      authTokenCache.expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      
      return token
    } else {
      throw new Error(`Authentication failed with status ${response.status}`)
    }
  } catch (error) {
    console.error("❌ [DTDC] Authentication error:", error.message)
    if (error.response) {
      console.error("Response status:", error.response.status)
      console.error("Response data:", error.response.data)
    }
    throw new Error(`DTDC authentication failed: ${error.message}`)
  }
}

/**
 * Track a consignment using AWB number
 * @param {string} awbNumber - The AWB/Consignment number (9 chars: 1 alphabet + 8 digits)
 * @param {boolean} includeAdditionalDetails - Whether to include additional tracking details
 * @returns {Promise<Object>} Tracking data in JSON format
 */
async function trackConsignment(awbNumber, includeAdditionalDetails = true) {
  try {
    // Validate AWB number format (9 chars: 1 alphabet + 8 digits)
    if (!awbNumber || typeof awbNumber !== "string") {
      throw new Error("AWB number is required")
    }

    const cleanAWB = awbNumber.trim().toUpperCase()
    if (!/^[A-Z]\d{8}$/.test(cleanAWB)) {
      throw new Error("Invalid AWB number format. Expected format: 1 alphabet followed by 8 digits (e.g., V01197967)")
    }

    // Get authentication token
    const token = await getAuthToken()

    // Get tracking endpoint
    const baseUrl = DTDC_CONFIG.environment === "staging"
      ? DTDC_CONFIG.staging.track
      : DTDC_CONFIG.production.track

    // Make tracking request
    const response = await axios.get(baseUrl, {
      params: {
        strcnno: cleanAWB,
        TrkType: "cnno",
        addtnIDtl: includeAdditionalDetails ? "Y" : "N",
        apikev: token, // API parameter name as per DTDC documentation
      },
      timeout: 15000, // 15 second timeout
      headers: {
        "Accept": "application/json",
      },
    })

    if (response.status === 200) {
      // Parse response - could be JSON or XML
      let trackingData = response.data

      // If response is XML, we'd need to parse it (for now, assuming JSON response)
      if (typeof trackingData === "string" && trackingData.trim().startsWith("<")) {
        // XML response - would need xml2js or similar to parse
        throw new Error("XML response format not yet supported. Please ensure API returns JSON.")
      }

      // Transform the response to a standardized format
      return transformTrackingData(trackingData)
    } else {
      throw new Error(`Tracking request failed with status ${response.status}`)
    }
  } catch (error) {
    console.error("❌ [DTDC] Tracking error:", error.message)
    if (error.response) {
      console.error("Response status:", error.response.status)
      console.error("Response data:", error.response.data)
    }
    throw new Error(`DTDC tracking failed: ${error.message}`)
  }
}

/**
 * Transform DTDC tracking response to standardized format
 * @param {Object} rawData - Raw response from DTDC API
 * @returns {Object} Standardized tracking data
 */
function transformTrackingData(rawData) {
  try {
    // Handle different response formats
    if (rawData.trackHeader && rawData.trackDetails) {
      // JSON format from API docs
      return {
        success: true,
        statusCode: rawData.statusCode || 200,
        status: rawData.status || "SUCCESS",
        awbNumber: rawData.trackHeader?.strShipmentNo || null,
        referenceNumber: rawData.trackHeader?.strRefNo || null,
        status: rawData.trackHeader?.strStatus || null,
        statusDate: rawData.trackHeader?.strStatusTransOn || null,
        statusTime: rawData.trackHeader?.strStatusTransTime || null,
        origin: rawData.trackHeader?.strOrigin || null,
        destination: rawData.trackHeader?.strDestination || null,
        bookedDate: rawData.trackHeader?.strBookedDate || null,
        bookedTime: rawData.trackHeader?.strBookedTime || null,
        pieces: rawData.trackHeader?.strPieces || null,
        weight: rawData.trackHeader?.strWeight || null,
        weightUnit: rawData.trackHeader?.strWeightUnit || null,
        remarks: rawData.trackHeader?.strRemarks || null,
        noOfAttempts: rawData.trackHeader?.strNoOfAttempts || null,
        rtoNumber: rawData.trackHeader?.strRtoNumber || null,
        trackingDetails: (rawData.trackDetails || []).map((detail) => ({
          code: detail.strCode,
          action: detail.strAction,
          manifestNo: detail.strManifestNo || "",
          origin: detail.strOrigin || "",
          destination: detail.strDestination || "",
          actionDate: detail.strActionDate || "",
          actionTime: detail.strActionTime || "",
          remarks: detail.sTrRemarks || detail.strRemarks || "",
        })),
        rawData: rawData, // Keep raw data for reference
      }
    } else if (rawData.DTDCREPLY) {
      // XML format (if parsed)
      const cnHeader = rawData.DTDCREPLY?.CONSIGNMENT?.CNHEADER
      const cnActions = rawData.DTDCREPLY?.CONSIGNMENT?.CNBODY?.CNACTION || []
      
      return {
        success: cnHeader?.CNTRACK === "True",
        awbNumber: getFieldValue(cnHeader, "strShipmentNo"),
        status: getFieldValue(cnHeader, "strStatus"),
        origin: getFieldValue(cnHeader, "strOrigin"),
        destination: getFieldValue(cnHeader, "strDestination"),
        trackingDetails: cnActions.map((action) => ({
          code: getFieldValue(action, "strCode"),
          action: getFieldValue(action, "strAction"),
          origin: getFieldValue(action, "strOrigin"),
          destination: getFieldValue(action, "strDestination"),
          actionDate: getFieldValue(action, "strActionDate"),
          remarks: getFieldValue(action, "strRemarks"),
        })),
        rawData: rawData,
      }
    } else {
      // Unknown format, return as-is
      return {
        success: true,
        rawData: rawData,
      }
    }
  } catch (error) {
    console.error("Error transforming tracking data:", error)
    return {
      success: false,
      error: error.message,
      rawData: rawData,
    }
  }
}

/**
 * Helper to extract field value from XML structure
 */
function getFieldValue(node, fieldName) {
  if (!node || !node.FIELD) return null
  const field = Array.isArray(node.FIELD) 
    ? node.FIELD.find((f) => f.NAME === fieldName)
    : node.FIELD.NAME === fieldName ? node.FIELD : null
  return field?.VALUE || field?._ || null
}

/**
 * Check pincode serviceability (delivery availability)
 * @param {string} pincode - 6-digit Indian pincode
 * @param {string} originPincode - Optional origin pincode (defaults to warehouse/store pincode)
 * @returns {Promise<Object>} Serviceability data
 */
async function checkPincodeServiceability(pincode, originPincode = null) {
  try {
    // Validate pincode format (6 digits for India)
    if (!pincode || typeof pincode !== "string") {
      throw new Error("Pincode is required")
    }

    const cleanPincode = pincode.trim().replace(/\s+/g, "")
    if (!/^\d{6}$/.test(cleanPincode)) {
      throw new Error("Invalid pincode format. Please enter a valid 6-digit pincode")
    }

    // Get authentication token
    let token
    try {
      token = await getAuthToken()
    } catch (authError) {
      // If authentication fails, use fallback logic
      console.warn("⚠️ [DTDC] Authentication failed, using fallback serviceability check")
      return getFallbackServiceability(cleanPincode)
    }

    // Get serviceability endpoint
    const baseUrl = DTDC_CONFIG.environment === "staging"
      ? DTDC_CONFIG.staging.serviceability
      : DTDC_CONFIG.production.serviceability

    try {
      // Attempt to call DTDC serviceability API
      const response = await axios.get(baseUrl, {
        params: {
          pincode: cleanPincode,
          originPincode: originPincode || process.env.DTDC_ORIGIN_PINCODE || "110001", // Default to Delhi
          apikey: token,
        },
        timeout: 10000, // 10 second timeout
        headers: {
          "Accept": "application/json",
        },
      })

      if (response.status === 200 && response.data) {
        return transformServiceabilityData(response.data, cleanPincode)
      }
    } catch (apiError) {
      // If API call fails, use fallback
      console.warn("⚠️ [DTDC] Serviceability API call failed, using fallback:", apiError.message)
      return getFallbackServiceability(cleanPincode)
    }

    // Fallback if no response
    return getFallbackServiceability(cleanPincode)
  } catch (error) {
    console.error("❌ [DTDC] Pincode serviceability error:", error.message)
    // Return fallback on error
    return getFallbackServiceability(pincode?.trim() || "")
  }
}

/**
 * Transform DTDC serviceability response to standardized format
 * @param {Object} rawData - Raw response from DTDC API
 * @param {string} pincode - The pincode that was checked
 * @returns {Object} Standardized serviceability data
 */
function transformServiceabilityData(rawData, pincode) {
  try {
    // Handle different response formats
    if (rawData.serviceable !== undefined) {
      return {
        success: true,
        serviceable: rawData.serviceable === true || rawData.serviceable === "true" || rawData.serviceable === "Y",
        pincode: pincode,
        estimatedDays: rawData.estimatedDays || rawData.estimated_days || (rawData.serviceable ? 5 : null),
        deliveryCharges: rawData.deliveryCharges || rawData.delivery_charges || null,
        message: rawData.message || rawData.msg || (rawData.serviceable ? "Delivery available" : "Delivery not available"),
        city: rawData.city || null,
        state: rawData.state || null,
        rawData: rawData,
      }
    } else if (rawData.status === "success" || rawData.statusCode === 200) {
      return {
        success: true,
        serviceable: true,
        pincode: pincode,
        estimatedDays: rawData.estimatedDays || 5,
        deliveryCharges: rawData.deliveryCharges || null,
        message: rawData.message || "Delivery available",
        city: rawData.city || null,
        state: rawData.state || null,
        rawData: rawData,
      }
    } else {
      // Unknown format, assume serviceable
      return {
        success: true,
        serviceable: true,
        pincode: pincode,
        estimatedDays: 5,
        deliveryCharges: null,
        message: "Delivery available",
        rawData: rawData,
      }
    }
  } catch (error) {
    console.error("Error transforming serviceability data:", error)
    return getFallbackServiceability(pincode)
  }
}

/**
 * Fallback serviceability check when API is unavailable
 * Uses basic pincode validation and common serviceable areas
 * @param {string} pincode - 6-digit pincode
 * @returns {Object} Serviceability data
 */
function getFallbackServiceability(pincode) {
  // Basic validation
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return {
      success: false,
      serviceable: false,
      pincode: pincode,
      message: "Invalid pincode format",
      estimatedDays: null,
      deliveryCharges: null,
      fallback: true,
    }
  }

  // List of known non-serviceable pincodes (can be expanded)
  const nonServiceablePincodes = [
    // Add specific non-serviceable pincodes if known
  ]

  if (nonServiceablePincodes.includes(pincode)) {
    return {
      success: true,
      serviceable: false,
      pincode: pincode,
      message: "Delivery not available to this pincode",
      estimatedDays: null,
      deliveryCharges: null,
      fallback: true,
    }
  }

  // Default: Assume serviceable for most pincodes
  // Estimate delivery days based on pincode region (rough approximation)
  const firstDigit = parseInt(pincode[0])
  let estimatedDays = 5 // Default

  // Rough estimation based on pincode zones
  if (firstDigit === 1 || firstDigit === 2) {
    // North India (Delhi, Haryana, etc.) - faster delivery
    estimatedDays = 3
  } else if (firstDigit === 3 || firstDigit === 4) {
    // West India (Gujarat, Maharashtra) - medium
    estimatedDays = 4
  } else if (firstDigit === 5 || firstDigit === 6) {
    // South India - medium
    estimatedDays = 5
  } else if (firstDigit === 7) {
    // East India (West Bengal, Odisha) - longer
    estimatedDays = 6
  } else {
    // Other regions
    estimatedDays = 5
  }

  return {
    success: true,
    serviceable: true,
    pincode: pincode,
    message: "Delivery available to this pincode",
    estimatedDays: estimatedDays,
    deliveryCharges: null, // Will be calculated based on order value
    fallback: true,
    note: "Using estimated delivery time. Actual delivery time may vary.",
  }
}

/**
 * Clear authentication token cache (useful for testing or forced refresh)
 */
function clearAuthCache() {
  authTokenCache.token = null
  authTokenCache.expiresAt = null
}

export {
  getAuthToken,
  trackConsignment,
  transformTrackingData,
  checkPincodeServiceability,
  clearAuthCache,
  DTDC_CONFIG,
}

