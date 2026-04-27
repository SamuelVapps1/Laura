import { registerSW } from "virtual:pwa-register"

registerSW({
  onNeedRefresh() {
    // Auto-update: reload when new content is available
    if (confirm("Nová verzia je k dispozícii. Chcete obnoviť?")) {
      location.reload()
    }
  },
  onOfflineReady() {
    console.log("App is ready to work offline")
  },
})
