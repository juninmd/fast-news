import { useEffect, useState } from "react";

const QUERY = "(max-width: 767px)";

function isNative(): boolean {
	return !!(
		globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }
	).Capacitor?.isNativePlatform?.();
}

function matches(): boolean {
	return isNative() || (window.matchMedia?.(QUERY).matches ?? false);
}

/** Phones and the native app get the mobile shell; wider screens keep the desktop layout. */
export function useIsMobile(): boolean {
	const [mobile, setMobile] = useState(matches);

	useEffect(() => {
		const mql = window.matchMedia?.(QUERY);
		if (!mql) return;
		const onChange = () => setMobile(matches());
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return mobile;
}
