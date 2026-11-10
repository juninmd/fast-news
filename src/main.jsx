import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/manrope";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import Root from "./app/Root";
import { installNativeFetch } from "./lib/apiBase";

installNativeFetch();

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<Root />
	</StrictMode>,
);
