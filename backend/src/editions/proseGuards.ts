import { isPollutedProse as isPolluted } from "@juninmd/digest-kit/core";

/** Model self-talk or decode garbage that must never reach a reader. */
export function isPollutedProse(text: string | undefined): boolean {
	return !!text && isPolluted(text);
}
