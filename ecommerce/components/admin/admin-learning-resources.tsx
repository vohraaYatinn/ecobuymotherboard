"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { FileText, Video, Download, Loader2, Plus, Trash2, Edit, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elecobuy.com"

interface LearningResource {
  _id: string
  title: string
  description?: string
  type: "manual" | "video" | "software"
  fileUrl: string
  fileName: string
  fileSize?: number
  downloadCount: number
  isActive: boolean
  createdAt: string
}

export function AdminLearningResources() {
  const router = useRouter()
  const [resources, setResources] = useState<LearningResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "manual" as "manual" | "video" | "software",
    file: null as File | null,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (activeTab !== "upload") {
      fetchResources()
    }
  }, [activeTab])

  const checkAuth = async () => {
    const token = localStorage.getItem("adminToken")
    if (!token) {
      router.push("/admin-login")
      return
    }
    fetchResources()
  }

  const fetchResources = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const response = await fetch(`${API_URL}/api/learning-resources/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setResources(data.data || [])
      } else {
        setError(data.message || "Failed to load resources")
      }
    } catch (err) {
      console.error("Error fetching resources:", err)
      setError("Failed to load resources. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const fileExt = selectedFile.name.toLowerCase().split('.').pop()
      
      // Validate file extension matches the selected type
      let isValid = false
      if (formData.type === "manual") {
        isValid = fileExt === "pdf" || fileExt === "avif"
      } else if (formData.type === "video") {
        isValid = ["avi", "mp4", "mov", "mkv", "webm", "avif"].includes(fileExt)
      } else if (formData.type === "software") {
        isValid = fileExt === "zip"
      }
      
      if (!isValid) {
        alert(`Invalid file type. Please select a ${formData.type === "manual" ? "PDF or AVIF" : formData.type === "video" ? "video file (AVI, MP4, MOV, etc.) or AVIF" : "ZIP"} file.`)
        e.target.value = "" // Reset file input
        return
      }
      
      setFormData({ ...formData, file: selectedFile })
    }
  }

  const handleTypeChange = (value: "manual" | "video" | "software") => {
    // Reset file when type changes
    setFormData({ ...formData, type: value, file: null })
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.file || !formData.title || !formData.type) {
      alert("Please fill in all required fields and select a file")
      return
    }

    try {
      setUploading(true)
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const uploadFormData = new FormData()
      uploadFormData.append("file", formData.file)
      uploadFormData.append("title", formData.title)
      uploadFormData.append("description", formData.description)
      uploadFormData.append("type", formData.type)

      console.log("📤 [LEARNING RESOURCES] Starting upload:", {
        title: formData.title,
        type: formData.type,
        fileName: formData.file?.name,
        fileSize: formData.file ? `${(formData.file.size / 1024 / 1024).toFixed(2)} MB` : "N/A",
        apiUrl: `${API_URL}/api/learning-resources/upload`,
      })

      const response = await fetch(`${API_URL}/api/learning-resources/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - browser will set it automatically with boundary for FormData
        },
        body: uploadFormData,
      })

      console.log("📥 [LEARNING RESOURCES] Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      })

      let data
      try {
        const text = await response.text()
        console.log("📥 [LEARNING RESOURCES] Response text:", text)
        if (!text) {
          throw new Error("Empty response from server")
        }
        data = JSON.parse(text)
      } catch (parseError) {
        console.error("❌ [LEARNING RESOURCES] Error parsing response:", parseError)
        console.error("❌ [LEARNING RESOURCES] Response status:", response.status)
        console.error("❌ [LEARNING RESOURCES] Response statusText:", response.statusText)
        
        let errorMessage = "Invalid response from server. Please try again."
        if (response.status === 413) {
          errorMessage = "File size is too large. Maximum file size is 500MB."
        } else if (response.status === 401) {
          errorMessage = "Authentication failed. Please log in again."
          router.push("/admin-login")
        } else if (response.status === 0) {
          errorMessage = "Network error. Please check your connection or CORS settings."
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later."
        }
        
        alert(errorMessage)
        return
      }

      if (!response.ok || !data.success) {
        console.error("❌ [LEARNING RESOURCES] Upload failed:", data)
        alert(data.message || "Error uploading resource. Please try again.")
        return
      }

      console.log("✅ [LEARNING RESOURCES] Upload successful:", data)
      alert("Resource uploaded successfully!")
      setIsUploadDialogOpen(false)
      setFormData({
        title: "",
        description: "",
        type: "manual",
        file: null,
      })
      fetchResources()
    } catch (err) {
      console.error("❌ [LEARNING RESOURCES] Error uploading resource:", err)
      console.error("❌ [LEARNING RESOURCES] Error details:", {
        name: err instanceof Error ? err.name : "Unknown",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      
      let errorMessage = "Network error. Please check your connection and try again."
      if (err instanceof TypeError && err.message.includes("fetch")) {
        errorMessage = "Failed to connect to server. Please check your internet connection and try again."
      } else if (err instanceof Error) {
        if (err.message.includes("timeout") || err.message.includes("TIMEOUT")) {
          errorMessage = "Upload timeout. The file may be too large or your connection is slow. Please try again."
        } else if (err.message.includes("CORS") || err.message.includes("cors")) {
          errorMessage = "CORS error. Please contact the administrator."
        } else {
          errorMessage = `Error: ${err.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (resource: LearningResource) => {
    setSelectedResource(resource)
    setFormData({
      title: resource.title,
      description: resource.description || "",
      type: resource.type,
      file: null,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedResource) return

    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const response = await fetch(
        `${API_URL}/api/learning-resources/${selectedResource._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            isActive: selectedResource.isActive,
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        alert("Resource updated successfully!")
        setIsEditDialogOpen(false)
        setSelectedResource(null)
        fetchResources()
      } else {
        alert(data.message || "Failed to update resource")
      }
    } catch (err) {
      console.error("Error updating resource:", err)
      alert("Error updating resource. Please try again.")
    }
  }

  const handleDelete = async () => {
    if (!selectedResource) return

    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin-login")
        return
      }

      const response = await fetch(
        `${API_URL}/api/learning-resources/${selectedResource._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (data.success) {
        alert("Resource deleted successfully!")
        setDeleteDialogOpen(false)
        setSelectedResource(null)
        fetchResources()
      } else {
        alert(data.message || "Failed to delete resource")
      }
    } catch (err) {
      console.error("Error deleting resource:", err)
      alert("Error deleting resource. Please try again.")
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const filteredResources = resources.filter((resource) => {
    if (activeTab === "all") return true
    return resource.type === activeTab
  })

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Learning Resources</h1>
          <p className="text-muted-foreground mt-1">
            Manage service manuals, training videos, and software downloads
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Upload Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Learning Resource</DialogTitle>
              <DialogDescription>
                Upload a new service manual (PDF), training video (AVI), or software package (ZIP)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="type">Resource Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Service Manual (PDF, AVIF)</SelectItem>
                    <SelectItem value="video">Training Video (AVI, MP4, MOV, AVIF)</SelectItem>
                    <SelectItem value="software">Software Download (ZIP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter resource title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter resource description (optional)"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="file">
                  File * ({formData.type === "manual" ? "PDF, AVIF" : formData.type === "video" ? "AVI, MP4, MOV, AVIF" : "ZIP"})
                </Label>
                <Input
                  id="file"
                  type="file"
                  key={formData.type} // Reset input when type changes
                  accept={
                    formData.type === "manual"
                      ? ".pdf,.avif,application/pdf,image/avif"
                      : formData.type === "video"
                        ? ".avi,.mp4,.mov,.mkv,.webm,.avif,video/*,image/avif"
                        : ".zip,application/zip,application/x-zip-compressed"
                  }
                  onChange={handleFileChange}
                  required
                />
                {formData.file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-destructive mb-6">
          <CardContent className="p-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="manual">Manuals</TabsTrigger>
          <TabsTrigger value="video">Videos</TabsTrigger>
          <TabsTrigger value="software">Software</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredResources.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No resources found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => (
                <Card key={resource._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{resource.title}</CardTitle>
                        {resource.description && (
                          <CardDescription className="mt-1">
                            {resource.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="ml-4">
                        {resource.type === "manual" && (
                          <FileText className="h-6 w-6 text-primary" />
                        )}
                        {resource.type === "video" && (
                          <Video className="h-6 w-6 text-primary" />
                        )}
                        {resource.type === "software" && (
                          <Download className="h-6 w-6 text-primary" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatFileSize(resource.fileSize)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            resource.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {resource.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Downloads: {resource.downloadCount}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(resource)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedResource(resource)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>Update resource information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the resource and its file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}











