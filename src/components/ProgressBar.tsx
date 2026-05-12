import type { Inspection } from '../types'

function pct(done: number, total: number) {
  if (total === 0) return 100
  return Math.round((done / total) * 100)
}

export function getSectionProgress(inspection: Inspection) {
  const adminDone = [
    inspection.admin.workshopName,
    inspection.admin.requestDate,
  ].filter(Boolean).length
  const adminTotal = 2

  const housingDone = inspection.housing.filter((i) => i.compliance !== null).length
  const facilitiesDone = inspection.facilities.filter((i) => i.compliance !== null).length

  const toolsDone = inspection.tools.filter((t) => t.description && t.partNumber).length
  const toolsTotal = Math.max(inspection.tools.length, 1)

  const materialsDone = inspection.materials.filter((m) => m.description && m.partNumberOrReference).length
  const materialsTotal = Math.max(inspection.materials.length, 1)

  const techDone = inspection.technicalData.filter((r) => r.publicationDescription && r.reference).length
  const techTotal = Math.max(inspection.technicalData.length, 1)

  const processesDone = inspection.processes.filter((r) => r.processName && r.reference).length
  const processesTotal = Math.max(inspection.processes.length, 1)

  const personnelDone = inspection.trainedPersonnel.filter((r) => r.nameAndJobTitle && r.licenseNumber).length
  const personnelTotal = Math.max(inspection.trainedPersonnel.length, 1)

  return {
    admin: pct(adminDone, adminTotal),
    housing: pct(housingDone, inspection.housing.length),
    facilities: pct(facilitiesDone, inspection.facilities.length),
    tools: pct(toolsDone, toolsTotal),
    materials: pct(materialsDone, materialsTotal),
    techData: pct(techDone, techTotal),
    processes: pct(processesDone, processesTotal),
    personnel: pct(personnelDone, personnelTotal),
  }
}

interface Props {
  inspection: Inspection
  currentSection: number
}

const SECTION_NAMES = ['Admin', 'Comp.', '2.1', '2.2', 'Equip.', 'Mat.', 'Tech.', 'Proc.', 'Pers.', 'Cont.', 'Export']

export default function ProgressBar({ inspection, currentSection }: Props) {
  const progress = getSectionProgress(inspection)
  const values = [
    progress.admin,
    100,
    progress.housing,
    progress.facilities,
    progress.tools,
    progress.materials,
    progress.techData,
    progress.processes,
    progress.personnel,
    100,
    100,
  ]

  return (
    <div className="flex gap-0.5 overflow-x-auto pb-1">
      {SECTION_NAMES.map((name, i) => (
        <div key={i} className="flex flex-col items-center min-w-[48px]">
          <div className="text-xs text-gray-500 mb-0.5 whitespace-nowrap">{name}</div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                values[i] === 100 ? 'bg-green-500' : values[i] > 0 ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              style={{ width: `${values[i]}%` }}
            />
          </div>
          {currentSection === i && (
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-0.5" />
          )}
        </div>
      ))}
    </div>
  )
}
