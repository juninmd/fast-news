import { useEffect, useState } from "react";
import { isNativeApp } from "../lib/apiBase";

const QUERY = "(max-width: 767px)";

function matches(): boolean {
	return isNativeApp() || (window.matchMedia?.(QUERY).matches ?? false);
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
