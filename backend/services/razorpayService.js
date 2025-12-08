import axios from "axios"
import crypto from "crypto"

// Hardcoded Razorpay credentials as requested
const RAZORPAY_KEY_ID = "rzp_test_Rp4vS6I7nGmWno"
const RAZORPAY_KEY_SECRET = "nl93rF11jwRW3n3MBxChzxVw"
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

export const razorpayConfig = {
  keyId: RAZORPAY_KEY_ID,
  merchantId: RAZORPAY_MERCHANT_ID,
  baseUrl: RAZORPAY_BASE_URL,
}

