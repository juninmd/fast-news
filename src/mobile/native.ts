const isNative = () =>
	!!(
		globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }
	).Capacitor?.isNativePlatform?.();

/** Opens the original story in the system browser (a plain tab on the web). */
export async function openExternal(url: string): Promise<void> {
	if (isNative()) {
		const { Browser } = await import("@capacitor/browser");
		await Browser.open({ url });
		return;
	}
	window.open(url, "_blank", "noopener,noreferrer");
}

/** Native share sheet, then Web Share, then the clipboard. Returns what happened. */
export async function shareLink(
	title: string,
	url: string,
): Promise<"shared" | "copied" | "failed"> {
	try {
		if (isNative()) {
			const { Share } = await import("@capacitor/share");
			await Share.share({ title, url });
			return "shared";
		}
		if (navigator.share) {
			await navigator.share({ title, url });
			return "shared";
		}
		await navigator.clipboard.writeText(url);
		return "copied";
	} catch {
		return "failed";
	}
}
