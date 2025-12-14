"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Video, Download, Loader2, FileDown, Eye } from "lucide-react"
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
  createdAt: string
}

export function LearningCenterContent() {
  const [activeTab, setActiveTab] = useState("manuals")
  const [manuals, setManuals] = useState<LearningResource[]>([])
  const [videos, setVideos] = useState<LearningResource[]>([])
  const [software, setSoftware] = useState<LearningResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAll, setShowAll] = useState({
    manuals: false,
    videos: false,
    software: false,
  })

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      setLoading(true)
      setError("")

      const [manualsRes, videosRes, softwareRes] = await Promise.all([
        fetch(`${API_URL}/api/learning-resources?type=manual`),
        fetch(`${API_URL}/api/learning-resources?type=video`),
        fetch(`${API_URL}/api/learning-resources?type=software`),
      ])

      const manualsData = await manualsRes.json()
      const videosData = await videosRes.json()
      const softwareData = await softwareRes.json()

      if (manualsData.success) {
        setManuals(manualsData.data || [])
      }
      if (videosData.success) {
        setVideos(videosData.data || [])
      }
      if (softwareData.success) {
        setSoftware(softwareData.data || [])
      }
    } catch (err) {
      console.error("Error fetching learning resources:", err)
      setError("Failed to load learning resources. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (resource: LearningResource) => {
    try {
      // Increment download count
      await fetch(`${API_URL}/api/learning-resources/${resource._id}/download`, {
        method: "POST",
      })

      // Open download link
      const downloadUrl = `${API_URL}${resource.fileUrl}`
      window.open(downloadUrl, "_blank")
    } catch (err) {
      console.error("Error downloading resource:", err)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const ResourceCard = ({ resource }: { resource: LearningResource }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{resource.title}</CardTitle>
            {resource.description && (
              <CardDescription className="text-sm mb-3">
                {resource.description}
              </CardDescription>
            )}
          </div>
          <div className="ml-4">
            {resource.type === "manual" && (
              <FileText className="h-8 w-8 text-primary" />
            )}
            {resource.type === "video" && (
              <Video className="h-8 w-8 text-primary" />
            )}
            {resource.type === "software" && (
              <Download className="h-8 w-8 text-primary" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatFileSize(resource.fileSize)}</span>
            <span>{formatDate(resource.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {resource.downloadCount} download{resource.downloadCount !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              {resource.type === "video" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(resource)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownload(resource)}
                  className="flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const ResourceGrid = ({
    resources,
    type,
  }: {
    resources: LearningResource[]
    type: "manuals" | "videos" | "software"
  }) => {
    const displayCount = showAll[type] ? resources.length : 6
    const displayedResources = resources.slice(0, displayCount)

    return (
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <p className="text-destructive text-center">{error}</p>
              <Button
                onClick={fetchResources}
                variant="outline"
                className="mt-4 w-full"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : displayedResources.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                No {type === "manuals" ? "service manuals" : type === "videos" ? "training videos" : "software downloads"} available at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedResources.map((resource) => (
                <ResourceCard key={resource._id} resource={resource} />
              ))}
            </div>
            {resources.length > 6 && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() =>
                    setShowAll({ ...showAll, [type]: !showAll[type] })
                  }
                >
                  {showAll[type] ? "Show Less" : "View All"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Learning Center
            </h1>
            <p className="text-lg text-muted-foreground">
              Access service manuals, training videos, and software downloads to enhance your technical knowledge and skills.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="manuals" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Service Manuals</span>
              <span className="sm:hidden">Manuals</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Training Videos</span>
              <span className="sm:hidden">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="software" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Software Downloads</span>
              <span className="sm:hidden">Software</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manuals" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Service Manuals</h2>
              <p className="text-muted-foreground">
                Browse and download comprehensive service manuals in PDF format.
              </p>
            </div>
            <ResourceGrid resources={manuals} type="manuals" />
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Training Videos</h2>
              <p className="text-muted-foreground">
                Watch instructional videos to learn repair techniques and troubleshooting methods.
              </p>
            </div>
            <ResourceGrid resources={videos} type="videos" />
          </TabsContent>

          <TabsContent value="software" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Software Downloads</h2>
              <p className="text-muted-foreground">
                Download software packages and tools needed for diagnostics and repairs.
              </p>
            </div>
            <ResourceGrid resources={software} type="software" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

