"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, Upload, X, FileText } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface UploadedFile {
  file: File
  preview?: string
}

export function VendorRegistrationForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    country: "",
    city: "",
    state: "",
    postcode: "",
    storePhone: "",
    gstNo: "",
    bankAccountNumber: "",
    ifscCode: "",
    pan: "",
    tan: "",
    referral: "",
  })

  // Validate form fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    if (!formData.address1.trim()) {
      newErrors.address1 = "Address is required"
    }
    if (!formData.country) {
      newErrors.country = "Please select a country"
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required"
    }
    if (!formData.state.trim()) {
      newErrors.state = "State is required"
    }
    if (!formData.postcode.trim()) {
      newErrors.postcode = "Postcode is required"
    }
    if (!formData.storePhone.trim()) {
      newErrors.storePhone = "Phone number is required"
    } else if (!/^\d{10}$/.test(formData.storePhone.replace(/\D/g, ""))) {
      newErrors.storePhone = "Phone number must be exactly 10 digits"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})
    
    // Validate all required fields
    if (!validateForm()) {
      toast({
        title: "Please fill all required fields",
        description: "Some fields are missing or invalid. Please check the form.",
        variant: "destructive",
      })
      return
    }

    // Show confirmation dialog
    setShowConfirmDialog(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const newFiles: UploadedFile[] = files.map((file) => ({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }))
      setUploadedFiles([...uploadedFiles, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    const file = uploadedFiles[index]
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false)
    setIsLoading(true)

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData()
      
      // Add text fields
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, formData[key as keyof typeof formData])
      })

      // Add files
      uploadedFiles.forEach((uploadedFile, index) => {
        formDataToSend.append("documents", uploadedFile.file)
      })

      const response = await fetch(`${API_URL}/api/vendors/register`, {
        method: "POST",
        body: formDataToSend,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsSuccess(true)
        toast({
          title: "Registration Submitted!",
          description: "Your application is pending approval. We'll notify you once it's reviewed.",
        })
        // Reset form
        setFormData({
          username: "",
          email: "",
          firstName: "",
          lastName: "",
          address1: "",
          address2: "",
          country: "",
          city: "",
          state: "",
          postcode: "",
          storePhone: "",
          gstNo: "",
          bankAccountNumber: "",
          ifscCode: "",
          pan: "",
          tan: "",
          referral: "",
        })
        // Clean up file previews
        uploadedFiles.forEach((file) => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview)
          }
        })
        setUploadedFiles([])
      } else {
        toast({
          title: "Registration Failed",
          description: data.message || "Something went wrong. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Vendor registration error:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-8">
      <h2 className="text-2xl font-bold mb-6">Vendor Registration</h2>
      <p className="text-muted-foreground mb-8">
        Fill in the details below to register as a seller on Elecobuy. All fields marked with * are required.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => {
                setFormData({ ...formData, username: e.target.value })
                if (errors.username) setErrors({ ...errors, username: "" })
              }}
              className={`mt-2 ${errors.username ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              placeholder="Choose a unique username"
            />
            {errors.username && <p className="text-sm text-red-500 mt-1">{errors.username}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                if (errors.email) setErrors({ ...errors, email: "" })
              }}
              className={`mt-2 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              placeholder="your@email.com"
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => {
                setFormData({ ...formData, firstName: e.target.value })
                if (errors.firstName) setErrors({ ...errors, firstName: "" })
              }}
              className={`mt-2 ${errors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => {
                setFormData({ ...formData, lastName: e.target.value })
                if (errors.lastName) setErrors({ ...errors, lastName: "" })
              }}
              className={`mt-2 ${errors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address1">Address 1 *</Label>
            <Input
              id="address1"
              value={formData.address1}
              onChange={(e) => {
                setFormData({ ...formData, address1: e.target.value })
                if (errors.address1) setErrors({ ...errors, address1: "" })
              }}
              className={`mt-2 ${errors.address1 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              placeholder="Street address"
            />
            {errors.address1 && <p className="text-sm text-red-500 mt-1">{errors.address1}</p>}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address2">Address 2</Label>
            <Input
              id="address2"
              value={formData.address2}
              onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
              className="mt-2"
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div>
            <Label htmlFor="country">Country *</Label>
            <Select 
              value={formData.country} 
              onValueChange={(value) => {
                setFormData({ ...formData, country: value })
                if (errors.country) setErrors({ ...errors, country: "" })
              }}
            >
              <SelectTrigger className={`mt-2 ${errors.country ? "border-red-500 focus:ring-red-500" : ""}`}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="usa">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="canada">Canada</SelectItem>
                <SelectItem value="australia">Australia</SelectItem>
              </SelectContent>
            </Select>
            {errors.country && <p className="text-sm text-red-500 mt-1">{errors.country}</p>}
          </div>

          <div>
            <Label htmlFor="city">City/Town *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => {
                setFormData({ ...formData, city: e.target.value })
                if (errors.city) setErrors({ ...errors, city: "" })
              }}
              className={`mt-2 ${errors.city ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
          </div>

          <div>
            <Label htmlFor="state">State/County *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => {
                setFormData({ ...formData, state: e.target.value })
                if (errors.state) setErrors({ ...errors, state: "" })
              }}
              className={`mt-2 ${errors.state ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.state && <p className="text-sm text-red-500 mt-1">{errors.state}</p>}
          </div>

          <div>
            <Label htmlFor="postcode">Postcode/Zip *</Label>
            <Input
              id="postcode"
              value={formData.postcode}
              onChange={(e) => {
                setFormData({ ...formData, postcode: e.target.value })
                if (errors.postcode) setErrors({ ...errors, postcode: "" })
              }}
              className={`mt-2 ${errors.postcode ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.postcode && <p className="text-sm text-red-500 mt-1">{errors.postcode}</p>}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="storePhone">Store Phone *</Label>
            <Input
              id="storePhone"
              type="tel"
              value={formData.storePhone}
              onChange={(e) => {
                // Only allow digits and limit to 10 digits
                const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                setFormData({ ...formData, storePhone: value })
                if (errors.storePhone) setErrors({ ...errors, storePhone: "" })
              }}
              className={`mt-2 ${errors.storePhone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              placeholder="Enter 10-digit phone number"
              maxLength={10}
              inputMode="numeric"
            />
            {errors.storePhone && <p className="text-sm text-red-500 mt-1">{errors.storePhone}</p>}
            {!errors.storePhone && formData.storePhone && (
              <p className="text-xs text-muted-foreground mt-1">
                {formData.storePhone.length}/10 digits
              </p>
            )}
          </div>

          {/* New Fields Section */}
          <div className="md:col-span-2 border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Business & Financial Information</h3>
          </div>

          <div>
            <Label htmlFor="gstNo">GST No</Label>
            <Input
              id="gstNo"
              value={formData.gstNo}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/\s/g, "")
                setFormData({ ...formData, gstNo: value })
              }}
              className="mt-2"
              placeholder="15-digit GST number"
              maxLength={15}
            />
          </div>

          <div>
            <Label htmlFor="pan">PAN</Label>
            <Input
              id="pan"
              value={formData.pan}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/\s/g, "")
                setFormData({ ...formData, pan: value })
              }}
              className="mt-2"
              placeholder="10-character PAN"
              maxLength={10}
            />
          </div>

          <div>
            <Label htmlFor="tan">TAN</Label>
            <Input
              id="tan"
              value={formData.tan}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/\s/g, "")
                setFormData({ ...formData, tan: value })
              }}
              className="mt-2"
              placeholder="10-character TAN"
              maxLength={10}
            />
          </div>

          <div>
            <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
            <Input
              id="bankAccountNumber"
              value={formData.bankAccountNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "")
                setFormData({ ...formData, bankAccountNumber: value })
              }}
              className="mt-2"
              placeholder="Bank account number"
            />
          </div>

          <div>
            <Label htmlFor="ifscCode">IFSC Code</Label>
            <Input
              id="ifscCode"
              value={formData.ifscCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/\s/g, "")
                setFormData({ ...formData, ifscCode: value })
              }}
              className="mt-2"
              placeholder="11-character IFSC code"
              maxLength={11}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="referral">Referral Code (Optional)</Label>
            <Input
              id="referral"
              value={formData.referral}
              onChange={(e) => setFormData({ ...formData, referral: e.target.value })}
              className="mt-2"
              placeholder="Enter referral code if any"
            />
          </div>

          {/* Document Upload Section */}
          <div className="md:col-span-2 border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload relevant business documents (GST certificate, PAN card, bank statement, etc.). Accepted formats: PDF, Images, Word documents. Max file size: 10MB per file.
            </p>
            <div className="border-2 border-dashed border-border rounded-lg p-6">
              <input
                type="file"
                id="documents"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="documents"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-foreground mb-1">
                  Click to upload documents
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, Images, or Word documents (Max 10MB each)
                </span>
              </label>
            </div>

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Uploaded Files ({uploadedFiles.length}):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {uploadedFiles.map((uploadedFile, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50"
                    >
                      {uploadedFile.preview ? (
                        <img
                          src={uploadedFile.preview}
                          alt={uploadedFile.file.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6">
          <Button 
            type="submit" 
            size="lg" 
            className="w-full md:w-auto"
            disabled={isLoading || isSuccess}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Submitted!
              </>
            ) : (
              "Register as Seller"
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            By registering, you agree to our Terms and Conditions and Privacy Policy.
          </p>
        </div>

        {isSuccess && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Registration Submitted Successfully!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-500 mt-2">
              Your vendor application is now pending approval. Our team will review your details and get back to you soon.
              You will be notified once your application is approved.
            </p>
          </div>
        )}
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your vendor registration? Please review your details before confirming.
              <br />
              <br />
              <strong>Username:</strong> {formData.username}
              <br />
              <strong>Email:</strong> {formData.email}
              <br />
              <strong>Store Phone:</strong> {formData.storePhone}
              {formData.gstNo && (
                <>
                  <br />
                  <strong>GST No:</strong> {formData.gstNo}
                </>
              )}
              {uploadedFiles.length > 0 && (
                <>
                  <br />
                  <strong>Documents:</strong> {uploadedFiles.length} file(s) uploaded
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
