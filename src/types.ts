export type ComplianceStatus = 'yes' | 'no' | 'na' | null

export interface PhotoEvidence {
  id: string
  blobKey: string
  thumbnailBlobKey: string
  caption: string
  timestamp: string
  width: number
  height: number
  sizeBytes: number
}

export interface AdminSection {
  workshopName: string
  requestDate: string
  responsibleForRequest: string
  rating: string
  ratingVerify: ComplianceStatus
}

export interface ComponentIdentification {
  description: string
  manufacturer: string
  partNumber: string
  scope: string
  ata: string
  applicableEquipment: string
  verify: ComplianceStatus
}

export interface HousingFacilityItem {
  id: string
  labelEs: string
  labelEn: string
  evidence: string
  compliance: ComplianceStatus
  photos: PhotoEvidence[]
}

export interface ToolRow {
  id: string
  description: string
  partNumber: string
  serialNumber: string
  calibrationExpiry: string
  toolKind: 'standard' | 'special' | 'equivalent' | 'calibration' | ''
  photos: PhotoEvidence[]
}

export interface MaterialRow {
  id: string
  description: string
  partNumberOrReference: string
  equivalent: string
  photos: PhotoEvidence[]
}

export interface TechnicalDataRow {
  id: string
  publicationDescription: string
  reference: string
  revNumber: string
  revDate: string
  photos: PhotoEvidence[]
}

export interface ProcessRow {
  id: string
  processName: string
  reference: string
  revNumber: string
  revDate: string
  photos: PhotoEvidence[]
}

export interface TrainedPersonnelRow {
  id: string
  nameAndJobTitle: string
  licenseNumber: string
  specificTraining: string
  compliance: ComplianceStatus
  photos: PhotoEvidence[]
}

export interface ValidationQuestion {
  id: string
  questionEs: string
  questionEn: string
  answer: ComplianceStatus
  photos: PhotoEvidence[]
}

export interface SectionVerify {
  housing: ComplianceStatus
  facilities: ComplianceStatus
  tools: ComplianceStatus
  materials: ComplianceStatus
  technicalData: ComplianceStatus
  processes: ComplianceStatus
  personnel: ComplianceStatus
}

export interface ContractMaintenanceService {
  id: string
  serviceType: string
  standard: string
}

export interface ContractMaintenance {
  services: ContractMaintenanceService[]
}

export interface Signatures {
  maintenanceResponsibleName: string
  maintenanceApproved: ComplianceStatus
  qualityControlResponsibleName: string
  qualityControlApproved: ComplianceStatus
  qualityAssuranceName: string
  qualityAssuranceApproved: ComplianceStatus
}

export interface Inspection {
  id: string
  schemaVersion: number
  createdAt: string
  updatedAt: string
  admin: AdminSection
  componentId: ComponentIdentification
  housing: HousingFacilityItem[]
  facilities: HousingFacilityItem[]
  tools: ToolRow[]
  toolsValidation: ValidationQuestion[]
  materials: MaterialRow[]
  technicalData: TechnicalDataRow[]
  processes: ProcessRow[]
  trainedPersonnel: TrainedPersonnelRow[]
  personnelValidation: ValidationQuestion[]
  sectionVerify: SectionVerify
  contractMaintenance: ContractMaintenance
  signatures: Signatures
  observations: string
}

export const HOUSING_ITEMS: Pick<HousingFacilityItem, 'id' | 'labelEs' | 'labelEn'>[] = [
  {
    id: 'housing-1',
    labelEn: 'Housing for facilities',
    labelEs: 'Edificios para las instalaciones.',
  },
  {
    id: 'housing-2',
    labelEn: 'Housing for equipment',
    labelEs: 'Alojamiento para el equipo.',
  },
  {
    id: 'housing-3',
    labelEn: 'Housing for material',
    labelEs: 'Alojamiento para el material.',
  },
  {
    id: 'housing-4',
    labelEn: 'Housing for personnel.',
    labelEs: 'Alojamiento para el personal.',
  },
]

export const FACILITIES_ITEMS: Pick<HousingFacilityItem, 'id' | 'labelEs' | 'labelEn'>[] = [
  {
    id: 'fac-1',
    labelEn: "Show's the workspace and areas necessary for the proper segregation of aeronautical items.",
    labelEs: 'Presenta el espacio de trabajo y áreas necesarias para la segregación adecuada de artículos aeronáuticos.',
  },
  {
    id: 'fac-2',
    labelEn: "Show's workspace and areas suitable for the protection of aeronautical items.",
    labelEs: 'Presenta espacio de trabajo y áreas adecuadas para la protección de artículos aeronáuticos.',
  },
  {
    id: 'fac-3',
    labelEn: "Show's work areas enabling environmentally hazardous or sensitive operations.",
    labelEs: 'Presenta áreas de trabajo para operaciones o trabajos sensibles al medio ambiente.',
  },
  {
    id: 'fac-4',
    labelEn: "Show's frames, forklifts, trays, supports, and other.",
    labelEs: 'Presenta bastidores, montacargas, bandejas, soportes y otros.',
  },
  {
    id: 'fac-5',
    labelEn: 'Provides enough space to segregate items and materials in stock for installation on items under maintenance.',
    labelEs: 'Presenta espacio suficiente para segregar artículos y materiales en stock para instalación en los artículos bajo mantenimiento.',
  },
  {
    id: 'fac-6',
    labelEn: 'Ventilation',
    labelEs: 'Ventilación',
  },
  {
    id: 'fac-7',
    labelEn: 'Lightings',
    labelEs: 'Iluminación',
  },
  {
    id: 'fac-8',
    labelEn: 'Temperature control',
    labelEs: 'Control de temperatura',
  },
  {
    id: 'fac-9',
    labelEn: 'Control of humidity.',
    labelEs: 'Control de humedad.',
  },
  {
    id: 'fac-10',
    labelEn: 'Control of other climatic conditions.',
    labelEs: 'Control de otras condiciones climáticas.',
  },
]

export const TOOLS_VALIDATION_QUESTIONS: Pick<ValidationQuestion, 'id' | 'questionEs' | 'questionEn'>[] = [
  {
    id: 'tv-1',
    questionEn: 'Do the equivalent tools have their own format?',
    questionEs: '¿Las herramientas equivalentes cuentan con su respectivo formato?',
  },
]

export const PERSONNEL_VALIDATION_QUESTIONS: Pick<ValidationQuestion, 'id' | 'questionEs' | 'questionEn'>[] = [
  {
    id: 'pv-1',
    questionEn: 'Is the specific course on the Syllabus?',
    questionEs: '¿El curso específico se encuentra en el Syllabus?',
  },
  {
    id: 'pv-2',
    questionEn: 'Is the course on the training matrix?',
    questionEs: '¿El curso se encuentra en la matriz de entrenamiento?',
  },
  {
    id: 'pv-3',
    questionEn: 'Is the personnel on the roster?',
    questionEs: '¿El personal se encuentra autorizado en el roster?',
  },
  {
    id: 'pv-4',
    questionEn: 'Does the personnel have the necessary courses to perform maintenance?',
    questionEs: '¿El personal cuenta con los cursos necesarios para realizar los mantenimientos?',
  },
]

export const MAX_PHOTOS_PER_ITEM = 5
export const SCHEMA_VERSION = 1

// ── Shared Evidence Catalog ───────────────────────────────────────────────────

/** Normalize any identifier to a stable match key */
export function catalogMatchKey(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ')
}

export interface CatalogTool {
  matchKey: string
  description: string
  partNumber: string
  photos: PhotoEvidence[]
}

export interface CatalogMaterial {
  matchKey: string
  description: string
  partNumberOrReference: string
  photos: PhotoEvidence[]
}

export interface CatalogPerson {
  matchKey: string
  nameAndJobTitle: string
  licenseNumber: string
  photos: PhotoEvidence[]
}

export interface Catalog {
  tools: CatalogTool[]
  materials: CatalogMaterial[]
  personnel: CatalogPerson[]
}
