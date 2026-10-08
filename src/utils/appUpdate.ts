let reloading = false

export const isReloadingForUpdate = () => reloading

/**
 * A tab left open across a deploy requests lazy chunks (exceljs, pdf.js) that no longer exist.
 * Vite reports that as `vite:preloadError`; tell the user and reload once to pick up the new build.
 * The delay lets the 500 ms autosave debounce flush before the page goes away.
 */
export function installStaleBuildReload(message: () => string) {
  window.addEventListener('vite:preloadError', () => {
    if (reloading) return
    reloading = true
    alert(message())
    setTimeout(() => window.location.reload(), 800)
  })
}
