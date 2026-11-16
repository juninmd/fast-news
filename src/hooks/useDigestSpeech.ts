import { useEffect, useRef, useState } from "react";

/** Browser speech synthesis: free, no server TTS or model involved. */
export function useDigestSpeech() {
	const [speaking, setSpeaking] = useState(false);
	const supported =
		typeof window !== "undefined" && "speechSynthesis" in window;
	const active = useRef(false);

	useEffect(
		() => () => {
			if (active.current) window.speechSynthesis.cancel();
		},
		[],
	);

	const stop = () => {
		if (supported) window.speechSynthesis.cancel();
		active.current = false;
		setSpeaking(false);
	};

	const play = async (period: string, scope: "all" | "ai") => {
		if (!supported) return;
		try {
			const res = await fetch(
				`/api/digests/${period}?format=script${scope === "ai" ? "&scope=ai" : ""}`,
			);
			if (!res.ok) return;
			const utterance = new SpeechSynthesisUtterance(await res.text());
			utterance.lang = "pt-BR";
			utterance.onend = utterance.onerror = () => {
				active.current = false;
				setSpeaking(false);
			};
			window.speechSynthesis.cancel();
			active.current = true;
			setSpeaking(true);
			window.speechSynthesis.speak(utterance);
		} catch {
			setSpeaking(false);
		}
	};

	return { speaking, supported, play, stop };
}
