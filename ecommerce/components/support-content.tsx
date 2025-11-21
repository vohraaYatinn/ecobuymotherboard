"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Phone, MessageCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function SupportContent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    orderID: "",
    category: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Support request:", formData)
    alert("Support request submitted successfully!")
  }

  const previousTickets = [
    {
      id: "TKT-001",
      subject: "Product damaged during delivery",
      status: "Resolved",
      date: "Jan 15, 2024",
    },
    {
      id: "TKT-002",
      subject: "Wrong item received",
      status: "In Progress",
      date: "Jan 20, 2024",
    },
  ]

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Customer Support</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          We're here to help. Get in touch with our support team
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Submit a Support Request</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Fill out the form below and we'll get back to you within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="mt-1.5"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="mt-1.5"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-sm">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="mt-1.5"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="orderID" className="text-sm">
                      Order ID (Optional)
                    </Label>
                    <Input
                      id="orderID"
                      value={formData.orderID}
                      onChange={(e) => setFormData({ ...formData, orderID: e.target.value })}
                      className="mt-1.5"
                      placeholder="ORD-2024-001"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm">
                    Issue Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">Order Issues</SelectItem>
                      <SelectItem value="product">Product Quality</SelectItem>
                      <SelectItem value="shipping">Shipping & Delivery</SelectItem>
                      <SelectItem value="payment">Payment Issues</SelectItem>
                      <SelectItem value="return">Returns & Refunds</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message" className="text-sm">
                    Describe Your Issue
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="mt-1.5 min-h-[120px]"
                    placeholder="Please provide as much detail as possible..."
                  />
                </div>

                <Button type="submit" size="lg" className="w-full sm:w-auto">
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Previous Tickets */}
          <Card className="mt-4 sm:mt-6">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Your Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {previousTickets.length > 0 ? (
                <div className="space-y-3">
                  {previousTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 rounded-lg border border-border"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base">{ticket.id}</p>
                          <Badge className={`text-xs ${ticket.status === "Resolved" ? "bg-green-500" : "bg-blue-500"}`}>
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.date}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm w-full sm:w-auto bg-transparent"
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No support tickets yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">Phone Support</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">+91 7396 777 800</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Mon-Sat, 9 AM - 6 PM</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">Email Support</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">customercare@ecobuy.com</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Response within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">Live Chat</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Business Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">Monday - Saturday</p>
                  <p className="text-muted-foreground">9:00 AM - 6:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">Sunday</p>
                  <p className="text-muted-foreground">Closed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Quick Help</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-xs sm:text-sm bg-transparent">
                Track My Order
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs sm:text-sm bg-transparent">
                Return Policy
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs sm:text-sm bg-transparent">
                Shipping Information
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs sm:text-sm bg-transparent">
                FAQs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
