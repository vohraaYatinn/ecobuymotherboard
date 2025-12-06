import axios from "axios"
import crypto from "crypto"

// Hardcoded merchant credentials as requested
const PHONEPE_MERCHANT_ID = "EKRANFIXONLINE"
const PHONEPE_SALT_KEY = "1a931f58-9f16-48c0-b657-cd3709f320d1"
const PHONEPE_SALT_INDEX = "1"

// Default to production gateway; override via env if needed
const PHONEPE_BASE_URL = process.env.PHONEPE_BASE_URL || "https://api.phonepe.com/apis/hermes"

const PAY_PATH = "/pg/v1/pay"

const buildXVerify = (payloadBase64, path) => {
  const stringToSign = `${payloadBase64}${path}${PHONEPE_SALT_KEY}`
  const hash = crypto.createHash("sha256").update(stringToSign).digest("hex")
  return `${hash}###${PHONEPE_SALT_INDEX}`
}

export async function createPhonePePayment({
  amountInPaise,
  merchantTransactionId,
  merchantUserId,
  redirectUrl,
  callbackUrl,
  mobileNumber,
}) {
  if (!PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY) {
    throw new Error("PhonePe credentials are missing")
  }

  const payload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId,
    merchantUserId,
    amount: amountInPaise,
    redirectUrl,
    redirectMode: "POST",
    callbackUrl,
    mobileNumber: mobileNumber?.slice(-10),
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64")
  const xVerify = buildXVerify(payloadBase64, PAY_PATH)

  const url = `${PHONEPE_BASE_URL}${PAY_PATH}`

  try {
    const { data } = await axios.post(
      url,
      { request: payloadBase64 },
      {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
        },
      }
    )
    return data
  } catch (error) {
    const providerData = error?.response?.data
    const status = error?.response?.status
    console.error("❌ PhonePe pay error:", status, providerData || error?.message)
    const err = new Error(providerData?.message || providerData?.code || error?.message || "PhonePe pay failed")
    err.statusCode = status || 500
    err.providerData = providerData
    throw err
  }
}

export async function getPhonePePaymentStatus(merchantTransactionId) {
  if (!PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY) {
    throw new Error("PhonePe credentials are missing")
  }

  const statusPath = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`
  const stringToSign = `${statusPath}${PHONEPE_SALT_KEY}`
  const hash = crypto.createHash("sha256").update(stringToSign).digest("hex")
  const xVerify = `${hash}###${PHONEPE_SALT_INDEX}`
  const url = `${PHONEPE_BASE_URL}${statusPath}`

  try {
    const { data } = await axios.get(url, {
      headers: {
        accept: "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
      },
    })

    return data
  } catch (error) {
    const providerData = error?.response?.data
    const status = error?.response?.status
    console.error("❌ PhonePe status error:", status, providerData || error?.message)
    const err = new Error(providerData?.message || providerData?.code || error?.message || "PhonePe status failed")
    err.statusCode = status || 500
    err.providerData = providerData
    throw err
  }
}

export const phonePeConfig = {
  merchantId: PHONEPE_MERCHANT_ID,
  saltIndex: PHONEPE_SALT_INDEX,
  baseUrl: PHONEPE_BASE_URL,
}

