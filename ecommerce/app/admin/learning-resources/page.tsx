"use client"

import { Suspense } from "react"
import { AdminLearningResources } from "@/components/admin/admin-learning-resources"

export default function AdminLearningResourcesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminLearningResources />
    </Suspense>
  )
}























