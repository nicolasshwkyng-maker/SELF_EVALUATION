import { Trash2, PlusCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useInspection } from '../../context/InspectionContext'
import ComplianceToggle from '../ComplianceToggle'
import type { ContractMaintenanceService } from '../../types'

function ServiceRow({ row, index, onChange, onDelete }: {
  row: ContractMaintenanceService
  index: number
  onChange: (r: ContractMaintenanceService) => void
  onDelete: () => void
}) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-gray-400 w-5 shrink-0">{index + 1}</span>
      <input
        type="text"
        value={row.serviceType}
        onChange={(e) => onChange({ ...row, serviceType: e.target.value })}
        placeholder="Tipo de servicio / Service type"
        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        type="text"
        value={row.standard}
        onChange={(e) => onChange({ ...row, standard: e.target.value })}
        placeholder="Norma / Standard"
        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700 p-1 shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function ContractSection() {
  const { inspection, update } = useInspection()
  if (!inspection) return null

  const { contractMaintenance, signatures } = inspection

  const addService = () => update((prev) => ({
    ...prev,
    contractMaintenance: {
      services: [...prev.contractMaintenance.services, { id: uuidv4(), serviceType: '', standard: '' }],
    },
  }))

  const updateService = (i: number, row: ContractMaintenanceService) =>
    update((prev) => {
      const services = [...prev.contractMaintenance.services]
      services[i] = row
      return { ...prev, contractMaintenance: { services } }
    })

  const deleteService = (i: number) =>
    update((prev) => ({
      ...prev,
      contractMaintenance: {
        services: prev.contractMaintenance.services.filter((_, idx) => idx !== i),
      },
    }))

  const setSig = (field: keyof typeof signatures, value: string) =>
    update((prev) => ({ ...prev, signatures: { ...prev.signatures, [field]: value } }))

  const setSigCompliance = (field: keyof typeof signatures, value: typeof signatures.maintenanceApproved) =>
    update((prev) => ({ ...prev, signatures: { ...prev.signatures, [field]: value } }))

  return (
    <div className="space-y-5">
      {/* Section 9 — Contract Maintenance */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">
          9. Contract Maintenance / Mantenimiento Contratado
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 mb-1">
            <span className="text-xs font-bold text-gray-500 uppercase">Tipo de Servicios / Service Type</span>
            <span className="text-xs font-bold text-gray-500 uppercase">Norma / Standard</span>
          </div>
          <div className="space-y-2">
            {contractMaintenance.services.map((row, i) => (
              <ServiceRow
                key={row.id}
                row={row}
                index={i}
                onChange={(r) => updateService(i, r)}
                onDelete={() => deleteService(i)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addService}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl py-2.5 hover:bg-blue-50 transition-colors text-sm font-medium"
          >
            <PlusCircle className="w-4 h-4" />
            Agregar servicio
          </button>

          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Mark / Note:</strong> External companies performing NDT inspections must be certified by the
            Authority and subsequently accepted by the Quality Assurance Area / Las empresas externas que realizan
            la inspección NDT deberán estar certificadas ante la Autoridad y posteriormente aceptadas por el Área
            de Aseguramiento de la Calidad.
          </div>
        </div>
      </div>

      {/* Signatures — Maintenance Responsible + Quality Control */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-3">Firmas / Signatures</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {/* Maintenance Responsible */}
          <div className="border border-gray-100 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-gray-600 uppercase">
              Maintenance Responsible / Responsable de Mantenimiento
            </p>
            <input
              type="text"
              value={signatures.maintenanceResponsibleName}
              onChange={(e) => setSig('maintenanceResponsibleName', e.target.value)}
              placeholder="Nombre y firma / Name and signature"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Approved? / ¿Aprobado?</span>
              <ComplianceToggle
                value={signatures.maintenanceApproved}
                onChange={(v) => setSigCompliance('maintenanceApproved', v)}
                showNa={false}
              />
            </div>
          </div>

          {/* Quality Control Responsible */}
          <div className="border border-gray-100 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-gray-600 uppercase">
              Quality Control Responsible / Responsable de Control de Calidad
            </p>
            <input
              type="text"
              value={signatures.qualityControlResponsibleName}
              onChange={(e) => setSig('qualityControlResponsibleName', e.target.value)}
              placeholder="Nombre y firma / Name and signature"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Approved? / ¿Aprobado?</span>
              <ComplianceToggle
                value={signatures.qualityControlApproved}
                onChange={(v) => setSigCompliance('qualityControlApproved', v)}
                showNa={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 9 — Audit */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-3">
          9. Audit / Auditoría
        </h3>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs text-gray-500 italic">
            Details of the audit is found in the annex (SAT-F649) — Detalle de la auditoría se encuentra en el Anexo (SAT-F649)
          </p>

          <div className="border border-gray-100 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-gray-600 uppercase">
              Quality Assurance / Aseguramiento de Calidad
            </p>
            <input
              type="text"
              value={signatures.qualityAssuranceName}
              onChange={(e) => setSig('qualityAssuranceName', e.target.value)}
              placeholder="Nombre y firma / Name and signature"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Approved? / ¿Aprobado?</span>
              <ComplianceToggle
                value={signatures.qualityAssuranceApproved}
                onChange={(v) => setSigCompliance('qualityAssuranceApproved', v)}
                showNa={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
