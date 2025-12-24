"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCcw, ArrowUpRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.34:5000"
const RETURN_WINDOW_DAYS = 3

interface Vendor {
  _id: string
  name: string
  phone?: string
}

interface Order {
  _id: string
  orderNumber: string
  vendorId?: Vendor | string | null
  status: string
  subtotal: number
  total: number
  updatedAt: string
  deliveredAt?: string | null
  returnRequest?: {
    type: "pending" | "accepted" | "denied" | "completed" | null
  } | null
}

interface VendorLedgerPayment {
  paid: number
  notes?: string
  updatedAt?: string
}

interface ApiResponse {
  success: boolean
  data: Order[]
  pagination?: {
    page: number
    pages: number
    total: number
  }
}

export function AdminLedger() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [showReadyOnly, setShowReadyOnly] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; name: string } | null>(null)
  const [paymentDraft, setPaymentDraft] = useState<VendorLedgerPayment>({ paid: 0, notes: "" })
  const [payments, setPayments] = useState<Record<string, VendorLedgerPayment>>({})
  const [savingPayment, setSavingPayment] = useState(false)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Not authenticated")
        return
      }

      const params = new URLSearchParams({
        status: "delivered",
        limit: "100",
        ...(search && { search }),
      })

      const res = await fetch(`${API_URL}/api/admin/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to load orders")
      }

      const data: ApiResponse = await res.json()
      if (!data.success) {
        throw new Error("Failed to load orders")
      }

      setOrders(data.data || [])
    } catch (err) {
      console.error("Ledger fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to load ledger")
    } finally {
      setLoading(false)
    }
  }

  const fetchLedgerPayments = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        return
      }

      const res = await fetch(`${API_URL}/api/vendor-ledger/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load ledger payments")
      }

      setPayments(data.data?.payments || {})
    } catch (err) {
      console.error("Ledger payments fetch error:", err)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchLedgerPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const now = Date.now()

  const ledgerRows = useMemo(() => {
    return (orders || [])
      .filter((order) => {
        if (!order.vendorId) return false // must be assigned to a vendor
        if (order.status !== "delivered") return false
        
        // Use deliveredAt if available, otherwise fallback to updatedAt (for older orders)
        const deliveryDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt)
        const deliveredAt = deliveryDate.getTime()
        const returnDeadline = deliveredAt + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
        const isWindowOver = now > returnDeadline
        if (showReadyOnly && !isWindowOver) return false
        // If not ready-only, still keep only delivered orders (some may be within window)
        // Exclude if a return is still pending/accepted/completed
        const rrType = order.returnRequest?.type
        if (rrType && rrType !== "denied") return false
        return true
      })
      .map((order) => {
        // Use deliveredAt if available, otherwise fallback to updatedAt (for older orders)
        const deliveryDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt)
        const deliveredAt = deliveryDate
        const returnDeadline = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)

        const platformCommission = order.subtotal * 0.2
        const payoutBeforeGateway = order.subtotal * 0.8
        const paymentGatewayCharges = payoutBeforeGateway * 0.02
        const netPayout = payoutBeforeGateway - paymentGatewayCharges

        const vendorName = typeof order.vendorId === "object" && order.vendorId !== null ? order.vendorId.name : "Vendor"
        const vendorPhone = typeof order.vendorId === "object" && order.vendorId !== null ? order.vendorId.phone : ""

        return {
          order,
          deliveredAt,
          returnDeadline,
          platformCommission,
          payoutBeforeGateway,
          paymentGatewayCharges,
          netPayout,
          vendorName,
          vendorPhone,
        }
      })
      .sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime())
  }, [orders, now, showReadyOnly])

  const vendorAggregates = useMemo(() => {
    const grouped: Record<
      string,
      {
        vendorName: string
        vendorPhone?: string
        orders: number
        productTotal: number
        gateway: number
        netPayout: number
      }
    > = {}

    ledgerRows.forEach((row) => {
      const vendorId =
        typeof row.order.vendorId === "object" && row.order.vendorId !== null
          ? row.order.vendorId._id
          : (row.order.vendorId as string)
      if (!vendorId) return
      if (!grouped[vendorId]) {
        grouped[vendorId] = {
          vendorName:
            typeof row.order.vendorId === "object" && row.order.vendorId !== null
              ? row.order.vendorId.name
              : "Vendor",
          vendorPhone:
            typeof row.order.vendorId === "object" && row.order.vendorId !== null
              ? row.order.vendorId.phone || ""
              : "",
          orders: 0,
          productTotal: 0,
          gateway: 0,
          netPayout: 0,
        }
      }

      grouped[vendorId].orders += 1
      grouped[vendorId].productTotal += row.order.subtotal
      grouped[vendorId].gateway += row.paymentGatewayCharges
      grouped[vendorId].netPayout += row.netPayout
    })

    return Object.entries(grouped).map(([vendorId, agg]) => ({
      vendorId,
      ...agg,
      paid: payments[vendorId]?.paid || 0,
      notes: payments[vendorId]?.notes || "",
      balance: agg.netPayout - (payments[vendorId]?.paid || 0),
    }))
  }, [ledgerRows, payments])

  const totals = useMemo(() => {
    const summary = ledgerRows.reduce(
      (acc, row) => {
        acc.productTotal += row.order.subtotal
        acc.gatewayCharges += row.paymentGatewayCharges
        acc.netPayout += row.netPayout
        return acc
      },
      { productTotal: 0, gatewayCharges: 0, netPayout: 0 },
    )
    return summary
  }, [ledgerRows])

  const openVendorLedger = (vendorId: string, vendorName: string) => {
    setSelectedVendor({ id: vendorId, name: vendorName })
    const record = payments[vendorId] || { paid: 0, notes: "" }
    setPaymentDraft({
      paid: record.paid,
      notes: record.notes || "",
      updatedAt: record.updatedAt,
    })
  }

  const saveVendorLedger = async () => {
    if (!selectedVendor) return

    try {
      setSavingPayment(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Not authenticated")
        return
      }

      const res = await fetch(`${API_URL}/api/vendor-ledger/admin/${selectedVendor.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid: Number(paymentDraft.paid) || 0,
          notes: paymentDraft.notes?.trim() || "",
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save ledger entry")
      }

      const nextPayments = data.data?.payments || payments
      setPayments(nextPayments)
      setSelectedVendor(null)
    } catch (err) {
      console.error("Ledger save error:", err)
      setError(err instanceof Error ? err.message : "Failed to save payment")
    } finally {
      setSavingPayment(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendor Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Payouts after the 3-day return window has elapsed
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search by order, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchOrders()
            }}
          />
          <Button onClick={fetchOrders} variant="outline" className="bg-transparent">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium">Ready for payout only</p>
            <p className="text-xs text-muted-foreground">
              Filters to delivered orders where the 3-day return window is over and no active returns exist.
            </p>
          </div>
          <Switch checked={showReadyOnly} onCheckedChange={setShowReadyOnly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Product Total</p>
            <p className="text-2xl font-semibold">₹{totals.productTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gateway Charges (approx)</p>
            <p className="text-2xl font-semibold text-orange-600">₹{totals.gatewayCharges.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net Payout to Vendors</p>
            <p className="text-2xl font-semibold text-green-700">₹{totals.netPayout.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Vendor Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {vendorAggregates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No vendors found for the current filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Vendor</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead className="text-right">Net Payout</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorAggregates.map((v) => (
                    <TableRow key={v.vendorId} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <button
                          className="text-left text-primary hover:underline"
                          onClick={() => openVendorLedger(v.vendorId, v.vendorName)}
                        >
                          {v.vendorName}
                        </button>
                        {v.vendorPhone && <div className="text-xs text-muted-foreground">{v.vendorPhone}</div>}
                      </TableCell>
                      <TableCell>{v.orders}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{v.netPayout.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-green-700">
                        ₹{v.paid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${v.balance < 0 ? "text-red-600" : "text-orange-600"}`}>
                        ₹{v.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openVendorLedger(v.vendorId, v.vendorName)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardTitle className="text-lg">
            Ready for Payout ({ledgerRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : ledgerRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No payouts pending (return window not over or returns pending).</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Order</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Return Deadline</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead className="text-right">Gateway (~2%)</TableHead>
                    <TableHead className="text-right">Net Payout</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerRows.map((row) => (
                    <TableRow key={row.order._id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-primary">
                        <Link href={`/admin/orders/${row.order._id}`} className="hover:underline">
                          {row.order.orderNumber}
                        </Link>
                        <div className="text-xs text-muted-foreground">Subtotal: ₹{row.order.subtotal.toLocaleString("en-IN")}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{row.vendorName}</div>
                        {row.vendorPhone && <div className="text-xs text-muted-foreground">{row.vendorPhone}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.deliveredAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline">
                          {row.returnDeadline.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{" "}
                          {row.returnDeadline.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{row.order.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        -₹{row.paymentGatewayCharges.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-green-700 font-semibold">
                        ₹{row.netPayout.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/orders/${row.order._id}`}>
                          <Button variant="ghost" size="sm" className="gap-2">
                            View <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vendor Ledger</DialogTitle>
            <DialogDescription>
              Record payouts for {selectedVendor?.name || "vendor"} (adjust “Paid” to reflect total paid-to-date).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paidAmount">Amount Paid (total to-date)</Label>
              <Input
                id="paidAmount"
                type="number"
                min="0"
                step="0.01"
                value={paymentDraft.paid}
                onChange={(e) => setPaymentDraft({ ...paymentDraft, paid: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="ledgerNotes">Notes</Label>
              <Textarea
                id="ledgerNotes"
                rows={3}
                placeholder="Add reference, UTR, or remarks"
                value={paymentDraft.notes}
                onChange={(e) => setPaymentDraft({ ...paymentDraft, notes: e.target.value })}
              />
            </div>
            {paymentDraft.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(paymentDraft.updatedAt).toLocaleString("en-IN")}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedVendor(null)}>
                Cancel
              </Button>
              <Button onClick={saveVendorLedger} disabled={savingPayment}>
                {savingPayment ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

