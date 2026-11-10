import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/manrope";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import Root from "./app/Root";
import { installNativeFetch } from "./lib/apiBase";

installNativeFetch();

const container = document.getElementById("root");
if (!container) throw new Error("#root is missing from index.html");

createRoot(container).render(
	<StrictMode>
		<Root />
	</StrictMode>,
);
