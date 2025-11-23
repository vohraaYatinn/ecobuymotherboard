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
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="flex w-full items-center justify-between text-base sm:text-lg font-semibold mb-3 sm:mb-4 touch-manipulation"
            aria-expanded={showCategories}
          >
            <span>Categories</span>
            {showCategories ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>

          {showCategories && (
            <div className="space-y-2.5 sm:space-y-3 max-h-[60vh] overflow-y-auto">
              {categories.map((category) => (
                <div key={category} className="flex items-start gap-2.5 sm:gap-3">
                  <Checkbox id={category} className="mt-0.5 h-4 w-4 sm:h-5 sm:w-5" />
                  <Label 
                    htmlFor={category} 
                    className="text-xs sm:text-sm leading-relaxed cursor-pointer hover:text-primary touch-manipulation flex-1"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full bg-transparent h-10 sm:h-11 text-sm sm:text-base touch-manipulation" variant="outline">
          Apply Filters
        </Button>
      </div>
    </aside>
  )
}
