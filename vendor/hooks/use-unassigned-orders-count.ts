import { useEffect, useRef, useState } from "react"
import { API_URL } from "@/lib/api-config"

type Options = {
  pollIntervalMs?: number
}

type State = {
  count: number
  loading: boolean
}

export function useUnassignedOrdersCount(options: Options = {}): State {
  const { pollIntervalMs = 15000 } = options
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const fetchCount = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("vendorToken")
        if (!token) {
          if (mountedRef.current) setCount(0)
          return
        }

        // Use pagination.total so we don't fetch full list just to count.
        const response = await fetch(`${API_URL}/api/vendor/orders/unassigned?page=1&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json()

        if (!response.ok || !data?.success) {
          if (response.status === 401) {
            // Let pages handle redirect/cleanup; just show 0 here.
            if (mountedRef.current) setCount(0)
          }
          return
        }

        const total = typeof data?.pagination?.total === "number" ? data.pagination.total : undefined
        const fallback = Array.isArray(data?.data) ? data.data.length : 0
        if (mountedRef.current) setCount(total ?? fallback)
      } catch {
        // Silent: don't disrupt page UI for a badge.
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    fetchCount()

    if (pollIntervalMs > 0) {
      interval = setInterval(fetchCount, pollIntervalMs)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [pollIntervalMs])

  return { count, loading }
}

