import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Catalog, Inspection, PhotoEvidence } from '../types'
import { catalogMatchKey } from '../types'
import { loadCatalog, saveCatalog, createEmptyCatalog } from '../db/indexeddb'

interface CatalogContextValue {
  catalog: Catalog
  /** Replace entire catalog (used after JSON import) */
  setCatalog: (c: Catalog) => void
  /** Merge inspection items into catalog without overwriting existing photos */
  syncFromInspection: (inspection: Inspection) => void
  /** Photo getters */
  findToolPhotos: (matchKey: string) => PhotoEvidence[]
  findMaterialPhotos: (matchKey: string) => PhotoEvidence[]
  findPersonPhotos: (matchKey: string) => PhotoEvidence[]
  /** Photo updaters */
  updateToolPhotos: (matchKey: string, photos: PhotoEvidence[]) => void
  updateMaterialPhotos: (matchKey: string, photos: PhotoEvidence[]) => void
  updatePersonPhotos: (matchKey: string, photos: PhotoEvidence[]) => void
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalogState] = useState<Catalog>(createEmptyCatalog())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadCatalog().then(setCatalogState)
  }, [])

  /** Core updater: sets state and schedules debounced persist */
  const applyUpdate = useCallback((updater: (prev: Catalog) => Catalog) => {
    setCatalogState((prev) => {
      const next = updater(prev)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveCatalog(next), 600)
      return next
    })
  }, [])

  const setCatalog = useCallback(
    (c: Catalog) => applyUpdate(() => ({
      // Sanitize: ensure all required arrays are present even if c is {} or partial
      tools:     Array.isArray(c?.tools)     ? c.tools     : [],
      materials: Array.isArray(c?.materials) ? c.materials : [],
      personnel: Array.isArray(c?.personnel) ? c.personnel : [],
    })),
    [applyUpdate],
  )

  const syncFromInspection = useCallback(
    (inspection: Inspection) => {
      applyUpdate((prev) => {
        const next: Catalog = {
          tools:     Array.isArray(prev?.tools)     ? [...prev.tools]     : [],
          materials: Array.isArray(prev?.materials) ? [...prev.materials] : [],
          personnel: Array.isArray(prev?.personnel) ? [...prev.personnel] : [],
        }

        for (const t of inspection.tools) {
          const key = catalogMatchKey(t.partNumber || t.description)
          if (!key) continue
          if (!next.tools.find((x) => x.matchKey === key)) {
            next.tools.push({
              matchKey: key,
              description: t.description,
              partNumber: t.partNumber,
              photos: [],
            })
          }
        }

        for (const m of inspection.materials) {
          const key = catalogMatchKey(m.partNumberOrReference || m.description)
          if (!key) continue
          if (!next.materials.find((x) => x.matchKey === key)) {
            next.materials.push({
              matchKey: key,
              description: m.description,
              partNumberOrReference: m.partNumberOrReference,
              photos: [],
            })
          }
        }

        for (const p of inspection.trainedPersonnel) {
          const key = catalogMatchKey(p.nameAndJobTitle)
          if (!key) continue
          if (!next.personnel.find((x) => x.matchKey === key)) {
            next.personnel.push({
              matchKey: key,
              nameAndJobTitle: p.nameAndJobTitle,
              licenseNumber: p.licenseNumber,
              photos: [],
            })
          }
        }

        return next
      })
    },
    [applyUpdate],
  )

  const findToolPhotos = useCallback(
    (key: string) => catalog.tools.find((t) => t.matchKey === key)?.photos ?? [],
    [catalog],
  )

  const findMaterialPhotos = useCallback(
    (key: string) => catalog.materials.find((m) => m.matchKey === key)?.photos ?? [],
    [catalog],
  )

  const findPersonPhotos = useCallback(
    (key: string) => catalog.personnel.find((p) => p.matchKey === key)?.photos ?? [],
    [catalog],
  )

  const updateToolPhotos = useCallback(
    (matchKey: string, photos: PhotoEvidence[]) =>
      applyUpdate((prev) => ({
        ...prev,
        tools: prev.tools.map((t) => (t.matchKey === matchKey ? { ...t, photos } : t)),
      })),
    [applyUpdate],
  )

  const updateMaterialPhotos = useCallback(
    (matchKey: string, photos: PhotoEvidence[]) =>
      applyUpdate((prev) => ({
        ...prev,
        materials: prev.materials.map((m) =>
          m.matchKey === matchKey ? { ...m, photos } : m,
        ),
      })),
    [applyUpdate],
  )

  const updatePersonPhotos = useCallback(
    (matchKey: string, photos: PhotoEvidence[]) =>
      applyUpdate((prev) => ({
        ...prev,
        personnel: prev.personnel.map((p) =>
          p.matchKey === matchKey ? { ...p, photos } : p,
        ),
      })),
    [applyUpdate],
  )

  return (
    <CatalogContext.Provider
      value={{
        catalog,
        setCatalog,
        syncFromInspection,
        findToolPhotos,
        findMaterialPhotos,
        findPersonPhotos,
        updateToolPhotos,
        updateMaterialPhotos,
        updatePersonPhotos,
      }}
    >
      {children}
    </CatalogContext.Provider>
  )
}
