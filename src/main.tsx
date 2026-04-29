import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./App"
import "./styles/globals.css"
import "./styles/print.css"
import "./pwa/register-sw"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
