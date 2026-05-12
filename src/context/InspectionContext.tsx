import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { Inspection } from '../types'
import { loadInspection, saveInspection, createEmptyInspection } from '../db/indexeddb'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface InspectionContextValue {
  inspection: Inspection | null
  saveStatus: SaveStatus
  update: (updater: (prev: Inspection) => Inspection) => void
  setInspection: (i: Inspection) => void
  loading: boolean
}

const InspectionContext = createContext<InspectionContextValue | null>(null)

export function InspectionProvider({ children }: { children: ReactNode }) {
  const [inspection, setInspectionState] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<Inspection | null>(null)

  useEffect(() => {
    loadInspection().then((data) => {
      setInspectionState(data ?? createEmptyInspection())
      setLoading(false)
    })
  }, [])

  const persist = useCallback((insp: Inspection) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    pendingRef.current = insp
    setSaveStatus('saving')
    debounceRef.current = setTimeout(async () => {
      try {
        await saveInspection(pendingRef.current!)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 500)
  }, [])

  const update = useCallback(
    (updater: (prev: Inspection) => Inspection) => {
      setInspectionState((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const setInspection = useCallback(
    (i: Inspection) => {
      setInspectionState(i)
      persist(i)
    },
    [persist],
  )

  return (
    <InspectionContext.Provider value={{ inspection, saveStatus, update, setInspection, loading }}>
      {children}
    </InspectionContext.Provider>
  )
}

export function useInspection() {
  const ctx = useContext(InspectionContext)
  if (!ctx) throw new Error('useInspection must be used within InspectionProvider')
  return ctx
}
