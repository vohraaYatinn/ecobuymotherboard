import { useState, useRef, useEffect, useCallback } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number // Distance in pixels to trigger refresh (default: 80)
  enabled?: boolean // Whether pull-to-refresh is enabled (default: true)
}

interface PullToRefreshState {
  isRefreshing: boolean
  pullDistance: number
  isPulling: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isRefreshing: false,
    pullDistance: 0,
    isPulling: false,
  })

  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const elementRef = useRef<HTMLElement | null>(null)
  const isDragging = useRef<boolean>(false)
  const scrollTop = useRef<number>(0)

  const handleRefresh = useCallback(async () => {
    if (state.isRefreshing) return

    setState((prev) => ({ ...prev, isRefreshing: true, pullDistance: 0, isPulling: false }))

    try {
      await onRefresh()
    } catch (error) {
      console.error('Pull-to-refresh error:', error)
    } finally {
      setState((prev) => ({ ...prev, isRefreshing: false, pullDistance: 0, isPulling: false }))
    }
  }, [onRefresh, state.isRefreshing])

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state.isRefreshing) return

      const element = elementRef.current
      if (!element) return

      // Find the scrollable container (could be the element itself or a child)
      let scrollableElement: HTMLElement | null = element
      
      // Check if element itself is scrollable
      const hasOverflow = element.scrollHeight > element.clientHeight
      if (!hasOverflow) {
        // Look for scrollable child (usually the first child with overflow)
        const children = Array.from(element.children) as HTMLElement[]
        scrollableElement = children.find(
          (child) => child.scrollHeight > child.clientHeight && 
          (getComputedStyle(child).overflowY === 'auto' || getComputedStyle(child).overflowY === 'scroll')
        ) || element
      }

      // Check if we're at the top of the scrollable container
      scrollTop.current = scrollableElement.scrollTop || 0

      if (scrollTop.current <= 0) {
        startY.current = e.touches[0].clientY
        currentY.current = startY.current
        isDragging.current = true
      }
    },
    [enabled, state.isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isDragging.current || state.isRefreshing) return

      const element = elementRef.current
      if (!element) return

      // Re-check scroll position to ensure we're still at top
      let scrollableElement: HTMLElement | null = element
      const hasOverflow = element.scrollHeight > element.clientHeight
      if (!hasOverflow) {
        const children = Array.from(element.children) as HTMLElement[]
        scrollableElement = children.find(
          (child) => child.scrollHeight > child.clientHeight && 
          (getComputedStyle(child).overflowY === 'auto' || getComputedStyle(child).overflowY === 'scroll')
        ) || element
      }
      
      const currentScrollTop = scrollableElement.scrollTop || 0

      currentY.current = e.touches[0].clientY
      const deltaY = currentY.current - startY.current

      // Only allow pulling down (positive deltaY) when at top
      if (deltaY > 0 && currentScrollTop <= 0) {
        e.preventDefault() // Prevent default scroll behavior
        const pullDistance = Math.min(deltaY * 0.5, threshold * 1.5) // Dampen the pull

        setState((prev) => ({
          ...prev,
          pullDistance,
          isPulling: pullDistance > 0,
        }))
      } else if (deltaY <= 0 || currentScrollTop > 0) {
        // Reset if user scrolls up or scrolls down
        setState((prev) => ({
          ...prev,
          pullDistance: 0,
          isPulling: false,
        }))
        isDragging.current = false
      }
    },
    [enabled, threshold, state.isRefreshing]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isDragging.current) return

    isDragging.current = false

    if (state.pullDistance >= threshold && !state.isRefreshing) {
      handleRefresh()
    } else {
      // Reset if not enough pull
      setState((prev) => ({
        ...prev,
        pullDistance: 0,
        isPulling: false,
      }))
    }
  }, [enabled, state.pullDistance, threshold, state.isRefreshing, handleRefresh])

  // Attach event listeners
  useEffect(() => {
    if (!enabled) return

    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Calculate pull progress (0 to 1)
  const pullProgress = Math.min(state.pullDistance / threshold, 1)

  return {
    elementRef,
    isRefreshing: state.isRefreshing,
    pullDistance: state.pullDistance,
    pullProgress,
    isPulling: state.isPulling,
    threshold,
  }
}
