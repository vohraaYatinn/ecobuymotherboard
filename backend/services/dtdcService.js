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
    orderUpload: "https://dtdcapi.shipsy.io/api/customer/integration/consignment/softdata",
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

// Try to pull AWB number from multiple possible DTDC fields/levels
function resolveAwbFromConsignment(consignment) {
  if (!consignment || typeof consignment !== "object") return null

  const directCandidates = [
    consignment.reference_number,
    consignment.awbno,
    consignment.awb_no,
    consignment.waybill_no,
  ]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => (typeof v === "string" ? v.trim() : v))
    .find(Boolean)

  if (directCandidates) return directCandidates

  if (Array.isArray(consignment.piece_details)) {
    const pieceAwb = consignment.piece_details
      .map((p) => {
        if (!p) return null
        const candidate = p.reference_number || p.awbno || p.awb_no || p.waybill_no
        return typeof candidate === "string" ? candidate.trim() : candidate
      })
      .find(Boolean)
    if (pieceAwb) return pieceAwb
  }

  return null
}

// Auto-sync shipment creation for DTDC Order Upload API (B2C / Express)
export async function createShipmentForOrder(order) {
  console.log(`🔵 [DTDC-DEBUG] ========================================`)
  console.log(`🔵 [DTDC-DEBUG] createShipmentForOrder called`)
  console.log(`🔵 [DTDC-DEBUG] Order Number: ${order?.orderNumber || "N/A"}`)
  console.log(`🔵 [DTDC-DEBUG] Order ID: ${order?._id || "N/A"}`)

  try {
    // Validate order data
    if (!order) {
      throw new Error("Order is required")
    }

    if (!order.shippingAddress) {
      throw new Error("Order shipping address is missing")
    }

    const shippingAddress = order.shippingAddress
    const customer = order.customerId || {}

    console.log(`🔵 [DTDC-DEBUG] Shipping Address:`, {
      name: `${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim(),
      address1: shippingAddress.address1,
      city: shippingAddress.city,
      state: shippingAddress.state,
      pincode: shippingAddress.postcode,
      phone: shippingAddress.phone,
    })

    // Use hard-coded production URL
    const url = DTDC_CONFIG.production.orderUpload || "https://dtdcapi.shipsy.io/api/customer/integration/consignment/softdata"
    console.log(`🔵 [DTDC-DEBUG] DTDC Order Upload URL: ${url}`)
    console.log(`🔵 [DTDC-DEBUG] API Key: ${DTDC_CONFIG.apiKey ? "***" + DTDC_CONFIG.apiKey.slice(-4) : "MISSING"}`)

    // Calculate total pieces
    const totalPieces = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : 1

    // Build payload according to DTDC Order Upload API spec
    const payload = {
      consignments: [
        {
          customer_code: process.env.DTDC_CUSTOMER_CODE || "", // You may need to set this
          service_type_id: "B2C PRIORITY",
          load_type: "NON-DOCUMENT",
          description: `Order ${order.orderNumber}`,
          dimension_unit: "cm",
          length: "70.0",
          width: "70.0",
          height: "55.0",
          weight_unit: "kg",
          weight: "1.0",
          declared_value: String(order.total || 0),
          num_pieces: String(totalPieces || 1),
          origin_details: {
            name: "ELECOBUY",
            phone: "8639979558",
            alternate_phone: "",
            address_line_1: "H N O 3-122/6, Chengicherla Road",
            address_line_2: "Besides Growel Feed Supplements and Mineral Mixtures, Boudha Nagar",
            pincode: "500098",
            city: "Hyderabad",
            state: "Telangana",
          },
          destination_details: {
            name: `${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim(),
            phone: shippingAddress.phone || "",
            alternate_phone: "",
            address_line_1: shippingAddress.address1 || "",
            address_line_2: shippingAddress.address2 || "",
            pincode: shippingAddress.postcode || "",
            city: shippingAddress.city || "",
            state: shippingAddress.state || "",
          },
          customer_reference_number: order.orderNumber,
          cod_collection_mode: order.paymentMethod === "cod" ? "CASH" : "",
          cod_amount: order.paymentMethod === "cod" ? String(order.total || 0) : "",
          commodity_id: "99",
          eway_bill: "",
          is_risk_surcharge_applicable: "false",
          invoice_number: order.invoiceNumber || order.orderNumber,
          invoice_date: new Date(order.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          reference_number: "",
        },
      ],
    }

    console.log(`🔵 [DTDC-DEBUG] Payload prepared:`, JSON.stringify(payload, null, 2))

    const headers = {
      "Content-Type": "application/json",
      "api-key": DTDC_CONFIG.apiKey,
    }

    console.log(`🔵 [DTDC-DEBUG] Making POST request to DTDC...`)
    const response = await axios.post(url, payload, {
      headers,
      timeout: 15000,
    })

    console.log(`🔵 [DTDC-DEBUG] DTDC Response Status: ${response.status}`)
    console.log(`🔵 [DTDC-DEBUG] DTDC Response Data:`, JSON.stringify(response.data, null, 2))

    const data = response.data || {}

    // Extract AWB from response (DTDC returns in data array)
    let awbNumber = null
    if (data.status === "OK" && Array.isArray(data.data) && data.data.length > 0) {
      const consignment = data.data[0]
      if (consignment.success === true) {
        awbNumber = resolveAwbFromConsignment(consignment)
        console.log(`✅ [DTDC-DEBUG] ✅ DTDC shipment created successfully!`)
        console.log(`✅ [DTDC-DEBUG] AWB Number: ${awbNumber}`)
      } else {
        console.error(`❌ [DTDC-DEBUG] DTDC returned success=false`)
        console.error(`❌ [DTDC-DEBUG] Error message:`, consignment.message)
        console.error(`❌ [DTDC-DEBUG] Error reason:`, consignment.reason)
      }
    } else {
      console.error(`❌ [DTDC-DEBUG] Unexpected response format`)
    }

    if (!awbNumber) {
      console.error(`❌ [DTDC-DEBUG] No AWB number found in response`)
      console.error(`❌ [DTDC-DEBUG] Full consignment for debugging:`, JSON.stringify((data.data && data.data[0]) || data, null, 2))
      throw new Error("DTDC shipment created but AWB number not found in response")
    }

    console.log(`✅ [DTDC-DEBUG] Returning success with AWB: ${awbNumber}`)
    console.log(`🔵 [DTDC-DEBUG] ========================================`)

    return {
      awbNumber,
      trackingData: data,
    }
  } catch (error) {
    console.error(`❌ [DTDC-DEBUG] ========================================`)
    console.error(`❌ [DTDC-DEBUG] ERROR in createShipmentForOrder`)
    console.error(`❌ [DTDC-DEBUG] Order: ${order?.orderNumber || "N/A"}`)
    console.error(`❌ [DTDC-DEBUG] Error: ${error.message}`)
    if (error.response) {
      console.error(`❌ [DTDC-DEBUG] HTTP Status: ${error.response.status}`)
      console.error(`❌ [DTDC-DEBUG] Response:`, JSON.stringify(error.response.data, null, 2))
    }
    console.error(`❌ [DTDC-DEBUG] Stack:`, error.stack)
    console.error(`❌ [DTDC-DEBUG] ========================================`)
    throw error
  }
}

export { DTDC_CONFIG }


