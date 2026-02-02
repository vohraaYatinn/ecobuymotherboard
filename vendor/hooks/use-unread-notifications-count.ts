import { useEffect, useRef, useState } from "react"
import { API_URL } from "@/lib/api-config"

type Options = {
  pollIntervalMs?: number
}

type State = {
  count: number
  loading: boolean
}

export function useUnreadNotificationsCount(options: Options = {}): State {
  const { pollIntervalMs = 30000 } = options
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

        const response = await fetch(`${API_URL}/api/notifications/vendor?unreadOnly=true&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json()

        if (response.ok && data?.success) {
          if (mountedRef.current) setCount(data?.data?.unreadCount || 0)
          return
        }

        if (response.status === 401) {
          // Token invalid/expired; don't redirect from a badge.
          if (mountedRef.current) setCount(0)
        }
      } catch {
        // Silent: don't disrupt UI for a header badge.
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

