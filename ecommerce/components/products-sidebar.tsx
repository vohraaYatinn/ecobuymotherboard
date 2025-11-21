"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronUp } from "lucide-react"

export function ProductsSidebar() {
  const [showCategories, setShowCategories] = useState(true)

  const categories = [
    "Television Inverter Boards",
    "Television Motherboard",
    "Television PCB Board",
    "Television Power Supply Boards",
    "Television T-Con Board",
    "Television Universal Motherboard",
    "Plasma TV Y,Z,X, & Buffer Board",
    "LED TV Panel PCB Boards, LED TV Scaler PCB Boards",
    "All Television Products",
  ]

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-6">
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="flex w-full items-center justify-between text-lg font-semibold mb-4"
          >
            Categories
            {showCategories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showCategories && (
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category} className="flex items-start gap-2">
                  <Checkbox id={category} className="mt-0.5" />
                  <Label htmlFor={category} className="text-sm leading-tight cursor-pointer hover:text-primary">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full bg-transparent" variant="outline">
          Apply Filters
        </Button>
      </div>
    </aside>
  )
}
