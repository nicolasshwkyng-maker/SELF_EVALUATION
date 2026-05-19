import { openDB, type IDBPDatabase } from 'idb'
import { v4 as uuidv4 } from 'uuid'
import type { Inspection, PhotoEvidence, Catalog } from '../types'
import {
  HOUSING_ITEMS,
  FACILITIES_ITEMS,
  TOOLS_VALIDATION_QUESTIONS,
  PERSONNEL_VALIDATION_QUESTIONS,
  SCHEMA_VERSION,
} from '../types'

const DB_NAME = 'sat-f743'
const DB_VERSION = 2
const INSPECTIONS_STORE = 'inspections'
const PHOTOS_STORE = 'photos_blobs'
const CATALOG_STORE = 'catalog'
const CURRENT_KEY = 'current'
const CATALOG_KEY = 'master'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(INSPECTIONS_STORE)) {
          db.createObjectStore(INSPECTIONS_STORE)
        }
        if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
          db.createObjectStore(PHOTOS_STORE)
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(CATALOG_STORE)) {
          db.createObjectStore(CATALOG_STORE)
        }
      },
    })
  }
  return dbPromise
}

export function createEmptyCatalog(): Catalog {
  return { tools: [], materials: [], personnel: [] }
}

export async function loadCatalog(): Promise<Catalog> {
  const db = await getDB()
  const data = await db.get(CATALOG_STORE, CATALOG_KEY)
  // Guard against corrupted catalog (e.g. {} without required arrays)
  const empty = createEmptyCatalog()
  if (!data) return empty
  return {
    tools:      Array.isArray(data.tools)     ? data.tools     : empty.tools,
    materials:  Array.isArray(data.materials)  ? data.materials  : empty.materials,
    personnel:  Array.isArray(data.personnel)  ? data.personnel  : empty.personnel,
  }
}

export async function saveCatalog(catalog: Catalog): Promise<void> {
  const db = await getDB()
  await db.put(CATALOG_STORE, catalog, CATALOG_KEY)
}

export function createEmptyInspection(): Inspection {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  return {
    id: uuidv4(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    admin: {
      workshopName: '',
      requestDate: today,
      responsibleForRequest: '',
      rating: '',
      ratingVerify: null,
    },
    componentId: {
      description: '',
      manufacturer: '',
      partNumber: '',
      scope: '',
      ata: '',
      applicableEquipment: '',
      verify: null,
    },
    housing: HOUSING_ITEMS.map((item) => ({
      ...item,
      evidence: '',
      compliance: null,
      photos: [],
    })),
    facilities: FACILITIES_ITEMS.map((item) => ({
      ...item,
      evidence: '',
      compliance: null,
      photos: [],
    })),
    tools: [],
    toolsValidation: TOOLS_VALIDATION_QUESTIONS.map((q) => ({
      ...q,
      answer: null,
      photos: [],
    })),
    materials: [],
    technicalData: [],
    processes: [],
    trainedPersonnel: [],
    personnelValidation: PERSONNEL_VALIDATION_QUESTIONS.map((q) => ({
      ...q,
      answer: null,
      photos: [],
    })),
    sectionVerify: {
      housing: null,
      facilities: null,
      tools: null,
      materials: null,
      technicalData: null,
      processes: null,
      personnel: null,
    },
    contractMaintenance: { services: [] },
    signatures: {
      maintenanceResponsibleName: '',
      maintenanceApproved: null,
      qualityControlResponsibleName: '',
      qualityControlApproved: null,
      qualityAssuranceName: '',
      qualityAssuranceApproved: null,
    },
    observations: '',
  }
}

export async function loadInspection(): Promise<Inspection | null> {
  const db = await getDB()
  const data = await db.get(INSPECTIONS_STORE, CURRENT_KEY)
  if (!data) return null
  // Forward-compatible migration: fill any fields added after the initial save
  const empty = createEmptyInspection()
  return {
    ...empty,
    ...data,
    contractMaintenance: data.contractMaintenance ?? empty.contractMaintenance,
    signatures: data.signatures ?? empty.signatures,
  }
}

export async function saveInspection(inspection: Inspection): Promise<void> {
  const db = await getDB()
  const updated = { ...inspection, updatedAt: new Date().toISOString() }
  await db.put(INSPECTIONS_STORE, updated, CURRENT_KEY)
}

export async function deleteInspection(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction([INSPECTIONS_STORE, PHOTOS_STORE], 'readwrite')
  await tx.objectStore(INSPECTIONS_STORE).delete(CURRENT_KEY)
  await tx.objectStore(PHOTOS_STORE).clear()
  await tx.done
}

export async function saveBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDB()
  await db.put(PHOTOS_STORE, blob, key)
}

export async function loadBlob(key: string): Promise<Blob | null> {
  const db = await getDB()
  return (await db.get(PHOTOS_STORE, key)) ?? null
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await getDB()
  await db.delete(PHOTOS_STORE, key)
}

export async function getAllBlobEntries(): Promise<{ key: string; blob: Blob }[]> {
  const db = await getDB()
  const tx = db.transaction(PHOTOS_STORE, 'readonly')
  const store = tx.objectStore(PHOTOS_STORE)
  const keys = await store.getAllKeys()
  const entries: { key: string; blob: Blob }[] = []
  for (const key of keys) {
    const blob = await store.get(key)
    if (blob) entries.push({ key: String(key), blob })
  }
  return entries
}

export async function saveBlobFromDataUrl(key: string, dataUrl: string): Promise<void> {
  // Use atob instead of fetch() — fetch(dataUrl) is unreliable in Safari PWA contexts.
  const comma = dataUrl.indexOf(',')
  const header = comma >= 0 ? dataUrl.slice(0, comma) : ''
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mime })
  await saveBlob(key, blob)
}

export { uuidv4 }
export type { PhotoEvidence }
