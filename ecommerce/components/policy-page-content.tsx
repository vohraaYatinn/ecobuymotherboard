"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.36:5000"

interface Section {
  heading: string
  content: string
  order: number
}

interface PageContent {
  slug: string
  title: string
  description?: string
  sections: Section[]
  isActive: boolean
  updatedAt?: string
}

interface PolicyPageContentProps {
  slug: string
  fallbackTitle: string
}

export function PolicyPageContent({ slug, fallbackTitle }: PolicyPageContentProps) {
  const [pageContent, setPageContent] = useState<PageContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPageContent()
  }, [slug])

  const fetchPageContent = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(`${API_URL}/api/page-content/${slug}`)
      const data = await response.json()

      if (data.success) {
        setPageContent(data.data)
      } else {
        setError(data.message || "Failed to load page content")
      }
    } catch (err) {
      console.error("Error fetching page content:", err)
      setError("Failed to load page content. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <h1 className="text-2xl font-bold text-foreground mb-4">Unable to Load Content</h1>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : pageContent ? (
            <>
              <h1 className="text-4xl font-bold text-foreground mb-8">
                {pageContent.title || fallbackTitle}
              </h1>

              {pageContent.description && (
                <p className="text-lg text-muted-foreground mb-8">{pageContent.description}</p>
              )}

              <div className="prose prose-lg max-w-none space-y-8">
                {pageContent.sections
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((section, index) => (
                    <section key={index}>
                      <h2 className="text-2xl font-bold mb-4">{section.heading}</h2>
                      <div className="text-muted-foreground whitespace-pre-wrap">
                        {section.content}
                      </div>
                    </section>
                  ))}

                {pageContent.updatedAt && (
                  <p className="text-sm text-muted-foreground mt-12 pt-8 border-t border-border">
                    Last Updated: {formatDate(pageContent.updatedAt)}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-24">
              <h1 className="text-2xl font-bold text-foreground mb-4">Page Not Found</h1>
              <p className="text-muted-foreground">
                The requested page could not be found.
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}







