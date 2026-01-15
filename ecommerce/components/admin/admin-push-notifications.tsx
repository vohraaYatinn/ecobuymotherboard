"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Users, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.43:5000"

interface Vendor {
  _id: string
  mobile: string
  name: string
  email: string
  vendorName: string
  vendorStatus: string
  hasTokens: boolean
  tokenCount: number
  isActive: boolean
}

export function AdminPushNotifications() {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [sendResult, setSendResult] = useState<{
    success: boolean
    sent: number
    failed: number
    total: number
    vendorsCount: number
    message: string
  } | null>(null)

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Not authenticated")
        return
      }

      const response = await fetch(`${API_URL}/api/push-notifications/admin/vendors`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to load vendors")
        return
      }

      setVendors(data.data.vendors || [])
    } catch (err) {
      console.error("Error fetching vendors:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVendorToggle = (vendorId: string) => {
    if (selectedVendors.includes(vendorId)) {
      setSelectedVendors(selectedVendors.filter((id) => id !== vendorId))
    } else {
      setSelectedVendors([...selectedVendors, vendorId])
    }
  }

  const handleSelectAll = () => {
    const vendorsWithTokens = vendors.filter((v) => v.hasTokens && v.isActive)
    if (selectedVendors.length === vendorsWithTokens.length) {
      setSelectedVendors([])
    } else {
      setSelectedVendors(vendorsWithTokens.map((v) => v._id))
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSendResult(null)

    if (!title.trim() || !body.trim()) {
      setError("Title and message are required")
      return
    }

    if (!sendToAll && selectedVendors.length === 0) {
      setError("Please select at least one vendor or select 'Send to all vendors'")
      return
    }

    try {
      setSending(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        setError("Not authenticated")
        return
      }

      // Auto-detect notification type from title for navigation
      let notificationType = 'general'
      const titleLower = title.toLowerCase()
      if (titleLower.includes('new order') || titleLower.includes('order available')) {
        notificationType = 'new_order_available'
      } else if (titleLower.includes('order placed')) {
        notificationType = 'order_placed'
      } else if (titleLower.includes('order accepted')) {
        notificationType = 'order_accepted'
      } else if (titleLower.includes('order shipped')) {
        notificationType = 'order_shipped'
      } else if (titleLower.includes('order delivered')) {
        notificationType = 'order_delivered'
      }

      const payload: {
        title: string
        body: string
        sendToAll?: boolean
        vendorIds?: string[]
        data?: Record<string, any>
      } = {
        title: title.trim(),
        body: body.trim(),
        data: {
          type: notificationType,
        },
      }

      if (sendToAll) {
        payload.sendToAll = true
      } else {
        payload.vendorIds = selectedVendors
      }

      const response = await fetch(`${API_URL}/api/push-notifications/admin/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to send push notification")
        toast({
          title: "Error",
          description: data.message || "Failed to send push notification",
          variant: "destructive",
        })
        return
      }

      setSendResult({
        success: true,
        sent: data.sent || 0,
        failed: data.failed || 0,
        total: data.total || 0,
        vendorsCount: data.vendorsCount || 0,
        message: data.message || "Notification sent successfully",
      })

      toast({
        title: "Success",
        description: data.message || "Push notification sent successfully",
      })

      // Reset form
      setTitle("")
      setBody("")
      setSelectedVendors([])
      setSendToAll(true)

      // Refresh vendors list
      fetchVendors()
    } catch (err) {
      console.error("Error sending push notification:", err)
      setError("Network error. Please try again.")
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const vendorsWithTokens = vendors.filter((v) => v.hasTokens && v.isActive)
  const vendorsWithoutTokens = vendors.filter((v) => !v.hasTokens || !v.isActive)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Send Push Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send push notifications to vendor app users
        </p>
      </div>

      {/* Send Result */}
      {sendResult && (
        <Card className={sendResult.failed > 0 ? "border-orange-200 bg-orange-50/50" : "border-green-200 bg-green-50/50"}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {sendResult.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{sendResult.message}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-green-600">{sendResult.sent}</strong> sent
                  </span>
                  {sendResult.failed > 0 && (
                    <span>
                      <strong className="text-red-600">{sendResult.failed}</strong> failed
                    </span>
                  )}
                  <span>
                    <strong>{sendResult.vendorsCount}</strong> vendor(s)
                  </span>
                  <span>
                    <strong>{sendResult.total}</strong> device(s)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Notification Form */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Details</CardTitle>
            <CardDescription>Compose your push notification message</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., New Order Received"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground">{title.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message *</Label>
                <Textarea
                  id="body"
                  placeholder="e.g., You have received a new order. Please check your orders page."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground">{body.length}/500 characters</p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="sendToAll"
                  checked={sendToAll}
                  onCheckedChange={(checked) => {
                    setSendToAll(checked as boolean)
                    if (checked) {
                      setSelectedVendors([])
                    }
                  }}
                />
                <Label htmlFor="sendToAll" className="font-normal cursor-pointer">
                  Send to all vendors with push tokens
                </Label>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={sending || loading}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Vendor Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Vendors</CardTitle>
            <CardDescription>
              Choose specific vendors to send notifications to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {vendorsWithTokens.length} vendor(s) with push tokens
                  </p>
                  {!sendToAll && vendorsWithTokens.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedVendors.length === vendorsWithTokens.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  )}
                </div>

                {sendToAll ? (
                  <div className="rounded-md bg-muted p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Notification will be sent to all {vendorsWithTokens.length} vendor(s) with
                      push tokens
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {vendorsWithTokens.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No vendors with push tokens found
                      </div>
                    ) : (
                      vendorsWithTokens.map((vendor) => (
                        <div
                          key={vendor._id}
                          className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50"
                        >
                          <Checkbox
                            id={vendor._id}
                            checked={selectedVendors.includes(vendor._id)}
                            onCheckedChange={() => handleVendorToggle(vendor._id)}
                            disabled={sendToAll}
                          />
                          <Label
                            htmlFor={vendor._id}
                            className="flex-1 cursor-pointer font-normal"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{vendor.name || vendor.vendorName || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {vendor.mobile} • {vendor.email || "No email"}
                                </p>
                              </div>
                              <Badge variant="secondary" className="ml-2">
                                {vendor.tokenCount} token{vendor.tokenCount !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {vendorsWithoutTokens.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      {vendorsWithoutTokens.length} vendor(s) without push tokens (will not
                      receive notifications)
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

