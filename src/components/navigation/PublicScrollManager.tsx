import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { shouldScrollToTop } from '../../features/student/publicScrollManagement.mjs'

export function PublicScrollManager() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const nextLocation = `${location.pathname}${location.search}${location.hash}`
  const previousLocation = useRef(nextLocation)

  useEffect(() => {
    if (shouldScrollToTop({ navigationType, hash: location.hash, previousLocation: previousLocation.current, nextLocation })) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    previousLocation.current = nextLocation
  }, [location.hash, navigationType, nextLocation])

  return null
}
