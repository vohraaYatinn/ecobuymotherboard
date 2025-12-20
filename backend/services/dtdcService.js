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
  // DTDC sometimes returns numeric-leading or longer AWBs (e.g., 7X109986044). Allow 9–12 alphanumeric.
  if (!/^[A-Z0-9]{9,12}$/.test(cleanAWB)) {
    throw new Error(
      "Invalid AWB number format. Expected 9-12 alphanumeric characters (e.g., V01197967 or 7X109986044)"
    )
  }

  const baseUrlOverride = process.env.DTDC_TRACK_URL
  const baseUrl =
    baseUrlOverride ||
    (DTDC_CONFIG.environment === "staging" ? DTDC_CONFIG.staging.track : DTDC_CONFIG.production.track)

  try {
    // Attempt 1: Basic auth (many production setups expect this)
    const [username, password] = DTDC_CONFIG.trackingCredentials.split(":")
    const params = {
      strcnno: cleanAWB,
      TrkType: "cnno",
      addtnIDtl: includeAdditionalDetails ? "Y" : "N",
    }

    const basicResp = await axios.get(baseUrl, {
      params,
      timeout: 15000,
      headers: { Accept: "application/json" },
      auth: { username, password },
    })

    if (basicResp.status === 200) {
      return transformTrackingData(basicResp.data)
    }

    // If basic auth didn't return 200, fall through to token flow
  } catch (err) {
    // Attempt 2: token-based tracking (apikev)
    try {
      const token = await getAuthToken()
      const params = {
        strcnno: cleanAWB,
        TrkType: "cnno",
        addtnIDtl: includeAdditionalDetails ? "Y" : "N",
        apikev: token,
      }

      const tokenResp = await axios.get(baseUrl, {
        params,
        timeout: 15000,
        headers: { Accept: "application/json" },
      })

      if (tokenResp.status !== 200) {
        throw new Error(`DTDC tracking (token flow) failed with status ${tokenResp.status}`)
      }

      return transformTrackingData(tokenResp.data)
    } catch (tokenErr) {
      const tStatus = tokenErr?.response?.status
      const tData = tokenErr?.response?.data
      const tDetail = tStatus ? `status ${tStatus}` : tokenErr.message
      const tBody = tData ? ` | body: ${JSON.stringify(tData).slice(0, 500)}` : ""
      throw new Error(`DTDC tracking request failed (token flow) (${tDetail})${tBody}`)
    }
  }
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

// Remove non-ASCII chars and collapse whitespace; ensure fallback if empty
function sanitizeAscii(value, fallback = "") {
  const cleaned = String(value || "")
    .replace(/[^\x00-\x7F]/g, " ") // remove non-ASCII
    .replace(/\s+/g, " ")
    .trim()

  const finalVal = cleaned || fallback
  return finalVal.slice(0, 120) // keep within a reasonable length
}

// Auto-sync shipment creation for DTDC Order Upload API (B2C / Express)
export async function createShipmentForOrder(order, options = {}) {
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

    // Normalize origin/destination (supports forward and reverse legs)
    const originInput = options.origin || {
      name: "ELECOBUY",
      phone: "8639979558",
      address1: "H N O 3-122/6, Chengicherla Road",
      address2: "Besides Growel Feed Supplements and Mineral Mixtures, Boudha Nagar",
      pincode: "500098",
      city: "Hyderabad",
      state: "Telangana",
    }

    const destinationInput =
      options.destination ||
      (shippingAddress
        ? {
            name: `${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim(),
            phone: shippingAddress.phone || "",
            address1: shippingAddress.address1,
            address2: shippingAddress.address2 || "",
            pincode: shippingAddress.postcode || "",
            city: shippingAddress.city || "",
            state: shippingAddress.state || "",
          }
        : null)

    if (!destinationInput) {
      throw new Error("Destination address is required for DTDC shipment")
    }

    // Sanitize address lines to avoid DTDC non-ASCII validation errors
    const destAddr1 = sanitizeAscii(
      destinationInput.address1,
      sanitizeAscii(`${destinationInput.city || ""} ${destinationInput.state || ""}`.trim(), "Address")
    )
    const destAddr2 = sanitizeAscii(destinationInput.address2 || "")

    const originAddr1 = sanitizeAscii(
      originInput.address1,
      sanitizeAscii(`${originInput.city || ""} ${originInput.state || ""}`.trim(), "Address")
    )
    const originAddr2 = sanitizeAscii(originInput.address2 || "")

    console.log(`🔵 [DTDC-DEBUG] Shipping Address:`, {
      name: `${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim(),
      address1: destAddr1,
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

    const referenceBase = options.referenceNumber || order.orderNumber
    const buildPayload = (referenceNumber) => ({
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
            name: sanitizeAscii(originInput.name || "Origin"),
            phone: originInput.phone || "",
            alternate_phone: "",
            address_line_1: originAddr1,
            address_line_2: originAddr2,
            pincode: sanitizeAscii(originInput.pincode || "", ""),
            city: sanitizeAscii(originInput.city || "", ""),
            state: sanitizeAscii(originInput.state || "", ""),
          },
          destination_details: {
            name: sanitizeAscii(destinationInput.name || "Destination"),
            phone: destinationInput.phone || "",
            alternate_phone: "",
            address_line_1: destAddr1,
            address_line_2: destAddr2,
            pincode: sanitizeAscii(destinationInput.pincode || "", ""),
            city: sanitizeAscii(destinationInput.city || "", ""),
            state: sanitizeAscii(destinationInput.state || "", ""),
          },
          customer_reference_number: referenceNumber,
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
    })

    const headers = {
      "Content-Type": "application/json",
      "api-key": DTDC_CONFIG.apiKey,
    }

    let attempt = 0
    let awbNumber = null
    let lastError = null
    let referenceNumber = referenceBase

    while (attempt < 2 && !awbNumber) {
      const payload = buildPayload(referenceNumber)
      const timeoutMs = attempt === 0 ? 15000 : 30000
      console.log(`🔵 [DTDC-DEBUG] Payload prepared (attempt ${attempt + 1}):`, JSON.stringify(payload, null, 2))
      console.log(`🔵 [DTDC-DEBUG] Making POST request to DTDC... (reference: ${referenceNumber}, timeout: ${timeoutMs}ms)`)

      let response
      try {
        response = await axios.post(url, payload, {
          headers,
          timeout: timeoutMs,
        })
      } catch (err) {
        const isTimeout =
          (err?.code && err.code === "ECONNABORTED") ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("timeout"))

        if (isTimeout && attempt === 0) {
          console.warn(`⚠️ [DTDC-DEBUG] Timeout on attempt ${attempt + 1}. Retrying with longer timeout...`)
          attempt += 1
          continue
        }

        lastError = err
        break
      }

      console.log(`🔵 [DTDC-DEBUG] DTDC Response Status: ${response.status}`)
      console.log(`🔵 [DTDC-DEBUG] DTDC Response Data:`, JSON.stringify(response.data, null, 2))

      const data = response.data || {}

      if (data.status === "OK" && Array.isArray(data.data) && data.data.length > 0) {
        const consignment = data.data[0]
        if (consignment.success === true) {
          awbNumber = resolveAwbFromConsignment(consignment)
          console.log(`✅ [DTDC-DEBUG] ✅ DTDC shipment created successfully!`)
          console.log(`✅ [DTDC-DEBUG] AWB Number: ${awbNumber}`)
          return {
            awbNumber,
            trackingData: data,
          }
        }

        const reason = consignment.reason || ""
        const message = consignment.message || ""
        console.error(`❌ [DTDC-DEBUG] DTDC returned success=false`)
        console.error(`❌ [DTDC-DEBUG] Error message:`, message)
        console.error(`❌ [DTDC-DEBUG] Error reason:`, reason)

        const isDuplicateRef =
          reason.toUpperCase().includes("CUSTOMER_REFERENCE_NUMBER_ALREADY_EXISTS") ||
          message.toUpperCase().includes("CUSTOMER REFERENCE NUMBER ALREADY EXISTS")

        if (isDuplicateRef && attempt === 0) {
          const suffix = `-R${Date.now()}`
          referenceNumber = `${referenceBase}${suffix}`
          console.warn(`⚠️ [DTDC-DEBUG] Reference duplicate. Retrying with ${referenceNumber}`)
          attempt += 1
          continue
        }

        lastError = new Error(`DTDC order upload failed: ${message || reason || "Unknown error"}`)
        break
      } else {
        console.error(`❌ [DTDC-DEBUG] Unexpected response format`)
        lastError = new Error("DTDC order upload failed: Unexpected response format")
        break
      }
    }

    if (!awbNumber) {
      console.error(`❌ [DTDC-DEBUG] No AWB number found in response`)
      throw lastError || new Error("DTDC shipment created but AWB number not found in response")
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


