import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applySkin, loadSkin } from "./lib/theme";
import { language } from "./i18n";
import "./styles.css";

document.documentElement.lang = language();
applySkin(loadSkin());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
