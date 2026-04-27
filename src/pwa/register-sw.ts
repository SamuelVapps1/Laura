import { registerSW } from "virtual:pwa-register"

registerSW({
  onOfflineReady() {
    console.log("App is ready to work offline")
  },
})
