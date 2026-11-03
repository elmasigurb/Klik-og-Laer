import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SchoolClass } from '../../types'
import { appwriteConfig } from '../../lib/appwrite'
import { useCatalog } from '../catalog/CatalogContext'
import { getClassIdFromPath, persistSelectedClassId, readSelectedClassId, resolveSelectedClassId } from './studentClassSelection.mjs'

interface StudentClassValue {
  activeClasses: SchoolClass[]
  selectedClass?: SchoolClass
  selectClass(classId: string): void
}

const StudentClassContext = createContext<StudentClassValue | null>(null)

export function StudentClassProvider({ children }: { children: ReactNode }) {
  const { classes, loading } = useCatalog()
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedClassId, setSelectedClassId] = useState(() => readSelectedClassId(window.localStorage))
  const activeClasses = useMemo(() => classes.filter((item) => item.status === 'active').sort((a, b) => a.displayOrder - b.displayOrder), [classes])
  const activeIds = useMemo(() => activeClasses.map((item) => item.id), [activeClasses])
  const routeClassId = getClassIdFromPath(location.pathname)

  useEffect(() => {
    if (!appwriteConfig.features.publicClassNavigation) return
    if (routeClassId && activeIds.includes(routeClassId)) {
      setSelectedClassId(routeClassId)
      persistSelectedClassId(window.localStorage, routeClassId)
      return
    }
    if (!loading && selectedClassId && !activeIds.includes(selectedClassId)) {
      setSelectedClassId('')
      persistSelectedClassId(window.localStorage, '')
    }
  }, [activeIds, loading, routeClassId, selectedClassId])

  const selectClass = useCallback((classId: string) => {
    const resolved = resolveSelectedClassId(classId, activeIds)
    setSelectedClassId(resolved)
    persistSelectedClassId(window.localStorage, resolved)
    navigate(resolved ? `/classes/${encodeURIComponent(resolved)}` : '/classes')
  }, [activeIds, navigate])

  const value = useMemo<StudentClassValue>(() => ({
    activeClasses,
    selectedClass: appwriteConfig.features.publicClassNavigation ? activeClasses.find((item) => item.id === selectedClassId) : undefined,
    selectClass,
  }), [activeClasses, selectClass, selectedClassId])

  return <StudentClassContext.Provider value={value}>{children}</StudentClassContext.Provider>
}

export function useStudentClass() {
  const value = useContext(StudentClassContext)
  if (!value) throw new Error('useStudentClass must be used inside StudentClassProvider')
  return value
}
