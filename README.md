# SAT-F743 — Evaluación de Capacidades de Mantenimiento

PWA para auditoría de talleres de soporte aeronáutico de SATENA. Permite recopilar evidencia fotográfica en campo y exportar el formato oficial SAT-F743 a PDF.

---

## Instalación local

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

## Build de producción

```bash
npm run build
```

Los archivos se generan en `dist/`.

---

## Despliegue

### Vercel

1. Importar el repositorio en [vercel.com](https://vercel.com).
2. Framework: **Vite** (se detecta automáticamente).
3. Build command: `npm run build`
4. Output directory: `dist`
5. El archivo `vercel.json` ya está configurado para SPA routing.

### Netlify

1. Importar el repositorio en [netlify.com](https://netlify.com).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. El archivo `netlify.toml` ya está configurado para SPA routing.

---

## Instalar como PWA

### Android (Chrome)
1. Abrir la URL en Chrome.
2. Menú → **"Añadir a pantalla de inicio"**.
3. La app funciona offline tras la primera carga.

### iOS (Safari)
1. Abrir la URL en Safari.
2. Botón compartir → **"Añadir a pantalla de inicio"**.
3. La app funciona offline tras la primera carga.

---

## Estructura del proyecto

```
src/
├── components/
│   ├── sections/         # Una sección por pantalla del formulario
│   ├── ComplianceToggle  # Toggle Sí/No/N/A
│   ├── PhotoCapture      # Captura y galería de fotos
│   ├── ProgressBar       # Barra de progreso por sección
│   ├── LanguageToggle    # Toggle ES/EN
│   └── Layout            # Shell con header, nav y footer
├── context/
│   └── InspectionContext # Estado global + auto-guardado (debounced 500ms)
├── db/
│   └── indexeddb.ts      # Wrapper sobre idb — dos stores: inspections + photos_blobs
├── i18n/
│   ├── es.json
│   └── en.json
├── pdf/
│   ├── exportFormatA.ts  # Réplica oficial SAT-F743
│   ├── exportFormatB.ts  # Reporte libre con fotos intercaladas
│   ├── pdfHelpers.ts     # Primitivas de dibujo
│   └── photoAnnex.ts     # Anexo fotográfico (2 fotos/página)
├── types.ts              # Interfaces TypeScript + datos semilla
└── utils/
    ├── imageProcessing   # Compresión + HEIC → JPEG + miniaturas
    ├── figureNumbering   # Numeración Fig. X-Y estable
    └── jsonExport        # Export/import JSON con imágenes en base64
```

---

## Estructura del JSON de exportación

```json
{
  "version": 1,
  "exportedAt": "2026-05-12T10:00:00.000Z",
  "inspection": { },
  "photos": [
    {
      "id": "uuid",
      "blobKey": "photo_uuid",
      "thumbnailBlobKey": "thumb_uuid",
      "caption": "Descripcion",
      "timestamp": "2026-05-12T10:00:00.000Z",
      "width": 1600,
      "height": 1200,
      "sizeBytes": 204800,
      "dataUrl": "data:image/jpeg;base64,...",
      "thumbDataUrl": "data:image/jpeg;base64,..."
    }
  ]
}
```

Al importar, el JSON se valida y las imágenes se re-guardan en IndexedDB con nuevas claves.

---

## Secciones del formulario

| # | Seccion | Descripcion |
|---|---------|-------------|
| 0 | Administrativa | Nombre del taller, fecha, responsable, rating |
| 1 | Identificacion del Componente | Descripcion, fabricante, P/N, alcance, ATA |
| 2.1 | Edificios / Housing | 4 items fijos con evidencia y cumplimiento |
| 2.2 | Instalaciones / Facilities | 10 items fijos con evidencia y cumplimiento |
| 3 | Equipos / Equipment | Tabla dinamica + pregunta de validacion |
| 4 | Material | Tabla dinamica con equivalentes |
| 5 | Datos Tecnicos | Tabla dinamica con Rev. No. y fecha |
| 6 | Procesos | Tabla dinamica con Rev. No. y fecha |
| 7 | Personal Entrenado | Tabla dinamica + 4 preguntas de validacion |
| - | Resumen | Advertencias, observaciones, exportar PDF/JSON |

---

## Tecnologias

- **React 18 + Vite + TypeScript** (strict)
- **Tailwind CSS v4**
- **idb** -- IndexedDB con promesas
- **pdf-lib** -- generacion de PDF
- **browser-image-compression** -- compresion JPEG en el navegador
- **vite-plugin-pwa + Workbox** -- service worker, precache, offline
- **react-i18next** -- ES / EN
- **lucide-react** -- iconos
