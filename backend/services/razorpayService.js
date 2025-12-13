import axios from "axios"
import crypto from "crypto"

// Hardcoded Razorpay credentials as requested
// const RAZORPAY_KEY_ID = "rzp_test_Rp4vS6I7nGmWno"
// const RAZORPAY_KEY_SECRET = "nl93rF11jwRW3n3MBxChzxVw"

//real
const RAZORPAY_KEY_ID = "rzp_live_RpobWbF6yCjn7p"
const RAZORPAY_KEY_SECRET = "Znm1sg4IUjB5UwsChm931veJ"

const RAZORPAY_MERCHANT_ID = "RCIOtoLufeT9e8"

const RAZORPAY_BASE_URL = process.env.RAZORPAY_BASE_URL || "https://api.razorpay.com/v1"

const buildAuthHeader = () => {
  const token = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")
  return `Basic ${token}`
}

export async function createRazorpayOrder({ amountInPaise, currency = "INR", receiptId, notes = {} }) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are missing")
  }

  try {
    const { data } = await axios.post(
      `${RAZORPAY_BASE_URL}/orders`,
      {
        amount: amountInPaise,
        currency,
        receipt: receiptId,
        payment_capture: 1,
        notes,
      },
      {
        headers: {
          Authorization: buildAuthHeader(),
          "Content-Type": "application/json",
        },
      }
    )

    return data
  } catch (error) {
    const providerData = error?.response?.data
    const status = error?.response?.status
    console.error("❌ Razorpay order error:", status, providerData || error?.message)
    const err = new Error(
      providerData?.error?.description ||
        providerData?.error?.code ||
        providerData?.message ||
        error?.message ||
        "Razorpay order creation failed"
    )
    err.statusCode = status || 500
    err.providerData = providerData
    throw err
  }
}

export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) return false

  const hmac = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
  hmac.update(`${orderId}|${paymentId}`)
  const digest = hmac.digest("hex")
  return digest === signature
}

export async function createRazorpayRefund({ paymentId, amountInPaise, notes = {} }) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are missing")
  }

  if (!paymentId) {
    throw new Error("Payment ID is required for refund")
  }

  try {
    const refundData = {
      amount: amountInPaise ? Math.round(amountInPaise) : undefined, // If not provided, full refund
      notes,
    }

    const { data } = await axios.post(
      `${RAZORPAY_BASE_URL}/payments/${paymentId}/refund`,
      refundData,
      {
        headers: {
          Authorization: buildAuthHeader(),
          "Content-Type": "application/json",
        },
      }
    )

    return data
  } catch (error) {
    const providerData = error?.response?.data
    const status = error?.response?.status
    console.error("❌ Razorpay refund error:", status, providerData || error?.message)
    const err = new Error(
      providerData?.error?.description ||
        providerData?.error?.code ||
        providerData?.message ||
        error?.message ||
        "Razorpay refund failed"
    )
    err.statusCode = status || 500
    err.providerData = providerData
    throw err
  }
}

export const razorpayConfig = {
  keyId: RAZORPAY_KEY_ID,
  merchantId: RAZORPAY_MERCHANT_ID,
  baseUrl: RAZORPAY_BASE_URL,
}



