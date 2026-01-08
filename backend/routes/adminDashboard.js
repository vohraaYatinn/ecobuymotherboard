import express from "express"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import Product from "../models/Product.js"
import Vendor from "../models/Vendor.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

const buildStatusCounts = (statusAgg) => {
  const defaultCounts = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    admin_review_required: 0,
    return_requested: 0,
    return_accepted: 0,
    return_rejected: 0,
  }

  statusAgg.forEach(({ _id, count }) => {
    if (_id && typeof defaultCounts[_id] !== "undefined") {
      defaultCounts[_id] = count
    }
  })

  return defaultCounts
}

const buildFinancialReport = (orders, vendorMap, gatewayRate, startDate) => {
  const filtered = orders.filter((order) => {
    const createdAt = new Date(order.createdAt || order.deliveredAt || Date.now())
    return createdAt >= startDate
  })

  const deliveredOrders = filtered.filter((order) => order.status === "delivered")

  let grossCollections = 0
  let gstCollected = 0
  let commissionEarned = 0
  let gatewayCharges = 0
  let returnsCount = 0

  filtered.forEach((order) => {
    const total = order.total || 0
    const gst = (order.cgst || 0) + (order.sgst || 0) + (order.igst || 0)
    const vendor = order.vendorId ? vendorMap.get(order.vendorId.toString()) : null
    const commissionBase = order.subtotal ?? order.total ?? 0
    const commissionRate = vendor?.commission || 0
    const commissionForOrder = Math.round((commissionBase * commissionRate) / 100)
    const payoutBeforeGateway = Math.max(commissionBase - commissionForOrder, 0)

    grossCollections += total
    gstCollected += gst
    commissionEarned += commissionForOrder

    if (order.paymentMethod === "online" || order.paymentMethod === "wallet") {
      gatewayCharges += Math.round(payoutBeforeGateway * gatewayRate)
    }

    if (order.returnRequest && order.returnRequest.type) {
      returnsCount += 1
    }
  })

  return {
    orders: filtered.length,
    deliveredOrders: deliveredOrders.length,
    grossCollections,
    gstCollected,
    commissionEarned,
    estimatedGatewayCharges: gatewayCharges,
    returns: returnsCount,
  }
}

// Get admin dashboard statistics
router.get("/stats", verifyAdminToken, async (_req, res) => {
  try {
    const [
      totalOrders,
      totalCustomers,
      totalProducts,
      activeVendors,
      statusAgg,
      revenueResult,
      recentOrders,
      pendingVendors,
      settledOrders,
    ] = await Promise.all([
      Order.countDocuments(),
      Customer.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Vendor.find({ isActive: true }).select("_id name email phone commission").lean(),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: "delivered", paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.find()
        .populate("customerId", "name mobile")
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber customerId total status paymentStatus createdAt")
        .lean(),
      Vendor.find({ status: "pending", isActive: true }).select("name email phone createdAt").limit(5).lean(),
      Order.find({ paymentStatus: { $in: ["paid", "refunded"] } })
        .select(
          "total subtotal cgst sgst igst paymentMethod paymentStatus vendorId status createdAt deliveredAt returnRequest"
        )
        .lean(),
    ])

    const orderStatus = buildStatusCounts(statusAgg)
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0

    // Prepare maps for quick lookups
    const vendorMap = new Map(activeVendors.map((v) => [v._id.toString(), v]))

    // Financial aggregates
    const grossCollections = settledOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const gstTotals = settledOrders.reduce(
      (acc, order) => {
        acc.cgst += order.cgst || 0
        acc.sgst += order.sgst || 0
        acc.igst += order.igst || 0
        return acc
      },
      { cgst: 0, sgst: 0, igst: 0 }
    )
    const gstTotal = gstTotals.cgst + gstTotals.sgst + gstTotals.igst

    // Payment method breakdown + estimated gateway charges
    const paymentMethodBreakdown = {
      cod: { amount: 0, count: 0 },
      online: { amount: 0, count: 0 },
      wallet: { amount: 0, count: 0 },
      other: { amount: 0, count: 0 },
    }
    settledOrders.forEach((order) => {
      const method = order.paymentMethod || "other"
      const bucket = paymentMethodBreakdown[method] || paymentMethodBreakdown.other
      bucket.amount += order.total || 0
      bucket.count += 1
    })
    const gatewayRate = 0.018 // 1.8% applied on payout-before-gateway for online + wallet
    const estimatedGatewayCharges = settledOrders.reduce((sum, order) => {
      if (order.paymentMethod !== "online" && order.paymentMethod !== "wallet") return sum

      const vendor = order.vendorId ? vendorMap.get(order.vendorId.toString()) : null
      const commissionBase = order.subtotal ?? order.total ?? 0
      const commissionRate = vendor?.commission || 0
      const commissionForOrder = Math.round((commissionBase * commissionRate) / 100)
      const payoutBeforeGateway = Math.max(commissionBase - commissionForOrder, 0)

      return sum + Math.round(payoutBeforeGateway * gatewayRate)
    }, 0)

    // Commission + seller payout liability
    // Use same calculation as admin ledger: subtotal - commission - gateway charges (NOT GST)
    const RETURN_WINDOW_DAYS = 3
    const GATEWAY_RATE = 0.02 // 2%
    const now = Date.now()
    const returnWindowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000

    let commissionEarned = 0
    const vendorPayouts = {}
    settledOrders.forEach((order) => {
      const vendorId = order.vendorId ? order.vendorId.toString() : null
      if (!vendorId || !vendorMap.has(vendorId)) return

      const vendor = vendorMap.get(vendorId)
      const commissionRate = vendor?.commission || 0
      const commissionMultiplier = commissionRate / 100
      const payoutMultiplier = 1 - commissionMultiplier
      const subtotal = order.subtotal ?? order.total ?? 0
      const commissionForOrder = Math.round(subtotal * commissionMultiplier)
      const gstForOrder = (order.cgst || 0) + (order.sgst || 0) + (order.igst || 0)
      
      // Check if order is eligible (delivered, paid, return window over, no active return)
      const isDelivered = order.status === "delivered" && order.paymentStatus === "paid"
      
      // Check return window
      const deliveryDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt)
      const deliveredAt = deliveryDate.getTime()
      const returnDeadline = deliveredAt + returnWindowMs
      const isReturnWindowOver = now > returnDeadline
      
      // Check for active returns
      const returnRequestType = order.returnRequest?.type
      const hasActiveReturn = returnRequestType && returnRequestType !== "denied"
      
      const isEligible = isDelivered && isReturnWindowOver && !hasActiveReturn

      if (isEligible) {
        commissionEarned += commissionForOrder
        
        // Calculate net payout using same formula as admin ledger
        const payoutBeforeGateway = subtotal * payoutMultiplier
        // Gateway charges only apply to online/wallet orders
        const paymentGatewayCharges = (order.paymentMethod === "online" || order.paymentMethod === "wallet")
          ? payoutBeforeGateway * GATEWAY_RATE
          : 0
        const netPayout = payoutBeforeGateway - paymentGatewayCharges

        if (!vendorPayouts[vendorId]) {
          vendorPayouts[vendorId] = {
            vendorId,
            name: vendor?.name || "Unknown Vendor",
            email: vendor?.email || "",
            phone: vendor?.phone || "",
            orderCount: 0,
            gross: 0,
            commission: 0,
            gstCollected: 0,
            pendingPayout: 0,
          }
        }

        vendorPayouts[vendorId].orderCount += 1
        vendorPayouts[vendorId].gross += order.total || 0
        vendorPayouts[vendorId].commission += commissionForOrder
        vendorPayouts[vendorId].gstCollected += gstForOrder
        vendorPayouts[vendorId].pendingPayout += Math.round(netPayout)
      }
    })

    const sellerPayouts = Object.values(vendorPayouts).sort((a, b) => b.pendingPayout - a.pendingPayout)
    const totalPayoutLiability = sellerPayouts.reduce((sum, vendor) => sum + vendor.pendingPayout, 0)

    // Returns / refunds / disputes
    const returnSummary = {
      pending: 0,
      accepted: 0,
      denied: 0,
      completed: 0,
      refunded: 0,
      inReview: orderStatus.admin_review_required || 0,
    }

    const returnOrders = settledOrders.filter((order) => order.returnRequest && order.returnRequest.type)

    returnOrders.forEach((order) => {
      const status = order.returnRequest?.type
      if (status && typeof returnSummary[status] !== "undefined") {
        returnSummary[status] += 1
      }
      if (order.returnRequest?.refundStatus === "completed" || order.paymentStatus === "refunded") {
        returnSummary.refunded += 1
      }
    })

    const recentReturns = returnOrders
      .sort((a, b) => {
        const aDate = new Date(a.returnRequest?.requestedAt || a.updatedAt || a.createdAt || 0)
        const bDate = new Date(b.returnRequest?.requestedAt || b.updatedAt || b.createdAt || 0)
        return bDate - aDate
      })
      .slice(0, 5)
      .map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.returnRequest?.type,
        refundStatus: order.returnRequest?.refundStatus,
        requestedAt: order.returnRequest?.requestedAt || order.createdAt,
      }))

    // Fetch cancelled orders
    const cancelledOrders = await Order.find({ status: "cancelled" })
      .populate("customerId", "name mobile")
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("orderNumber customerId total status paymentStatus createdAt updatedAt paymentMeta")
      .lean()

    const recentCancelled = cancelledOrders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      cancelledAt: order.paymentMeta?.cancelledAt || order.updatedAt || order.createdAt,
      customer: order.customerId ? {
        name: order.customerId.name,
        mobile: order.customerId.mobile,
      } : null,
    }))

    // Date ranges for reports
    const now = new Date()
    const startToday = new Date(now)
    startToday.setHours(0, 0, 0, 0)
    const startWeek = new Date(startToday)
    startWeek.setDate(startWeek.getDate() - 7)
    const startMonth = new Date(startToday)
    startMonth.setDate(startMonth.getDate() - 30)

    const reports = {
      daily: buildFinancialReport(settledOrders, vendorMap, gatewayRate, startToday),
      weekly: buildFinancialReport(settledOrders, vendorMap, gatewayRate, startWeek),
      monthly: buildFinancialReport(settledOrders, vendorMap, gatewayRate, startMonth),
    }

    res.status(200).json({
      success: true,
      data: {
        totals: {
          orders: totalOrders,
          customers: totalCustomers,
          products: totalProducts,
          vendors: activeVendors.length,
          revenue: totalRevenue,
        },
        orderStatus,
        recentOrders,
        pendingVendors,
        financials: {
          grossCollections,
          gst: {
            ...gstTotals,
            total: gstTotal,
          },
          gstPayable: {
            total: gstTotal,
            breakdown: gstTotals,
          },
          commissions: {
            total: commissionEarned,
          },
          gatewayCharges: {
            estimated: estimatedGatewayCharges,
            rate: gatewayRate,
            paymentMethodBreakdown,
          },
          payouts: {
            totalLiability: totalPayoutLiability,
            vendors: sellerPayouts,
          },
          returns: {
            summary: returnSummary,
            recent: recentReturns,
          },
          cancelled: {
            count: orderStatus.cancelled || 0,
            recent: recentCancelled,
          },
          reports,
        },
      },
    })
  } catch (error) {
    console.error("Get admin dashboard stats error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    })
  }
})

export default router



