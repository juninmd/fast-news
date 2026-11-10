/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

/** Injected by the Capacitor runtime inside the native app; absent on the web. */
// biome-ignore lint/style/noVar: ambient globals are declared with var
declare var Capacitor: { isNativePlatform?: () => boolean } | undefined;
