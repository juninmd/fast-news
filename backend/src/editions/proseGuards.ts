// Ported from evo-agent src/agent/editorial.ts, where these caught drifted
// fallbacks publishing instruction echoes and broken decodes.
const PROMPT_LEAK =
	/verifiquei tudo|n[aã]o h[aá] conte[uú]do proibido|write the (technical )?content|potentially controversial content|as an ai (language )?model|como (um )?modelo de linguagem,? (eu )?n[aã]o posso/i;

const MODEL_ARTIFACT_TOKENS = /<unk>|<pad>|\[UNK\]|<\/?s>|�/i;

/** Model self-talk or decode garbage that must never reach a reader. */
export function isPollutedProse(text: string | undefined): boolean {
	return !!text && (PROMPT_LEAK.test(text) || MODEL_ARTIFACT_TOKENS.test(text));
}
