"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface NavigationContextType {
  selectedCustomerId: string | null
  selectedOrderId: string | null
  setSelectedCustomerId: (id: string | null) => void
  setSelectedOrderId: (id: string | null) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  return (
    <NavigationContext.Provider
      value={{
        selectedCustomerId,
        selectedOrderId,
        setSelectedCustomerId,
        setSelectedOrderId,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}






























