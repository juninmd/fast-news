import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/manrope";
import { ToastProvider } from "@juninmd/sonido";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@juninmd/sonido/styles.css";
import { installNativeFetch } from "./apiBase";
import Root from "./Root";

installNativeFetch();

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<ToastProvider>
			<Root />
		</ToastProvider>
	</StrictMode>,
);
