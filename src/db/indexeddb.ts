import { openDB, type IDBPDatabase } from 'idb'
import { v4 as uuidv4 } from 'uuid'
import type { Inspection, PhotoEvidence } from '../types'
import {
  HOUSING_ITEMS,
  FACILITIES_ITEMS,
  TOOLS_VALIDATION_QUESTIONS,
  PERSONNEL_VALIDATION_QUESTIONS,
  SCHEMA_VERSION,
} from '../types'

const DB_NAME = 'sat-f743'
const DB_VERSION = 1
const INSPECTIONS_STORE = 'inspections'
const PHOTOS_STORE = 'photos_blobs'
const CURRENT_KEY = 'current'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(INSPECTIONS_STORE)) {
          db.createObjectStore(INSPECTIONS_STORE)
        }
        if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
          db.createObjectStore(PHOTOS_STORE)
        }
      },
    })
  }
  return dbPromise
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
  return data ?? null
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
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  await saveBlob(key, blob)
}

export { uuidv4 }
export type { PhotoEvidence }
