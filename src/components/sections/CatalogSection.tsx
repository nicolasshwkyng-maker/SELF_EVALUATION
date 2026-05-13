import { useState } from 'react'
import { Images, Wrench, Package, Users } from 'lucide-react'
import { useCatalog } from '../../context/CatalogContext'
import PhotoCapture from '../PhotoCapture'
import type { PhotoEvidence } from '../../types'

type TabId = 'tools' | 'materials' | 'personnel'

const TABS: { id: TabId; label: string; icon: typeof Wrench }[] = [
  { id: 'tools', label: 'Equipos', icon: Wrench },
  { id: 'materials', label: 'Material', icon: Package },
  { id: 'personnel', label: 'Personal', icon: Users },
]

function PhotoBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
      <Images className="w-3 h-3" />
      {count} foto{count !== 1 ? 's' : ''}
    </span>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-gray-400">
      <p className="text-sm">No hay {label} en el catálogo.</p>
      <p className="text-xs mt-1">Importa un JSON de inspección para poblar el catálogo.</p>
    </div>
  )
}

// ── Tools tab ────────────────────────────────────────────────────────────────
function ToolsTab() {
  const { catalog, updateToolPhotos } = useCatalog()

  if (catalog.tools.length === 0) return <EmptyState label="equipos" />

  return (
    <div className="space-y-3">
      {catalog.tools.map((tool) => (
        <div key={tool.matchKey} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{tool.description || '—'}</p>
              <p className="text-xs text-gray-500 font-mono">{tool.partNumber || '—'}</p>
            </div>
            <PhotoBadge count={tool.photos.length} />
          </div>
          <PhotoCapture
            photos={tool.photos}
            onChange={(photos: PhotoEvidence[]) => updateToolPhotos(tool.matchKey, photos)}
          />
        </div>
      ))}
    </div>
  )
}

// ── Materials tab ────────────────────────────────────────────────────────────
function MaterialsTab() {
  const { catalog, updateMaterialPhotos } = useCatalog()

  if (catalog.materials.length === 0) return <EmptyState label="materiales" />

  return (
    <div className="space-y-3">
      {catalog.materials.map((mat) => (
        <div key={mat.matchKey} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{mat.description || '—'}</p>
              <p className="text-xs text-gray-500 font-mono">{mat.partNumberOrReference || '—'}</p>
            </div>
            <PhotoBadge count={mat.photos.length} />
          </div>
          <PhotoCapture
            photos={mat.photos}
            onChange={(photos: PhotoEvidence[]) => updateMaterialPhotos(mat.matchKey, photos)}
          />
        </div>
      ))}
    </div>
  )
}

// ── Personnel tab ────────────────────────────────────────────────────────────
function PersonnelTab() {
  const { catalog, updatePersonPhotos } = useCatalog()

  if (catalog.personnel.length === 0) return <EmptyState label="personal" />

  return (
    <div className="space-y-3">
      {catalog.personnel.map((person) => (
        <div key={person.matchKey} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{person.nameAndJobTitle || '—'}</p>
              {person.licenseNumber && (
                <p className="text-xs text-gray-500">Licencia: {person.licenseNumber}</p>
              )}
            </div>
            <PhotoBadge count={person.photos.length} />
          </div>
          <PhotoCapture
            photos={person.photos}
            onChange={(photos: PhotoEvidence[]) => updatePersonPhotos(person.matchKey, photos)}
          />
        </div>
      ))}
    </div>
  )
}

// ── Main section ─────────────────────────────────────────────────────────────
export default function CatalogSection() {
  const [activeTab, setActiveTab] = useState<TabId>('tools')
  const { catalog } = useCatalog()

  const counts: Record<TabId, number> = {
    tools: catalog.tools.length,
    materials: catalog.materials.length,
    personnel: catalog.personnel.length,
  }

  const photoCounts: Record<TabId, number> = {
    tools: catalog.tools.reduce((s, t) => s + t.photos.length, 0),
    materials: catalog.materials.reduce((s, m) => s + m.photos.length, 0),
    personnel: catalog.personnel.reduce((s, p) => s + p.photos.length, 0),
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">10. Catálogo Compartido</h2>
        <p className="text-xs text-gray-500 mt-1">
          Evidencia transversal — las fotos aquí se muestran en todas las inspecciones que compartan el mismo ítem.
          Importa un JSON para poblar el catálogo automáticamente.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label }) => (
          <div key={id} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-slate-800">{counts[id]}</div>
            <div className="text-xs text-gray-500">{label}</div>
            {photoCounts[id] > 0 && (
              <div className="text-xs text-emerald-600 font-medium mt-0.5">{photoCounts[id]} fotos</div>
            )}
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {counts[id] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pb-4">
        {activeTab === 'tools' && <ToolsTab />}
        {activeTab === 'materials' && <MaterialsTab />}
        {activeTab === 'personnel' && <PersonnelTab />}
      </div>
    </div>
  )
}
