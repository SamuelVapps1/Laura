import { registerSW } from "virtual:pwa-register"

registerSW({
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.info("App is ready to work offline")
    }
  },
})
