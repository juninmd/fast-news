import { clipSentence } from "./text.js";

// The timeline model sometimes describes the article instead of the news:
// "O novo artigo confirma…", "O estado anterior descrevia…". That is a note
// to the editor, not something a reader should get as a fact.
const ABOUT_THE_ARTICLE =
	/estado anterior|nova camada de informa|hist[óo]ria j[áa] conhecida|(?:^|[.!?]\s+)(?:o |este |esse |um )?(?:novo )?artigo(?![\p{L}\p{N}])(?!\s+\d)|^(?:adiciona|acrescenta|complementa|atualiza|traz|detalha|consolida)(?![\p{L}\p{N}])/iu;

// Bullets and diamonds the model prefixes to a sentence.
const LEADING_MARKS = /^[\s◆◇•▪▫■□●○★☆▶►»*]+|^[-–—]+(?=\s)/u;

/** Text that talks about the article or the story's state, not the fact. */
export function isEditorNote(text: string): boolean {
	return ABOUT_THE_ARTICLE.test(text);
}

/**
 * The line shown for one thread event: the model's "what changed" when it
 * reads as news, else the article's own headline.
 */
export function beatText(
	whatChanged: string | null | undefined,
	headline: string,
	max = 200,
): string {
	const note = (whatChanged ?? "").replace(LEADING_MARKS, "").trim();
	const usable = note.length > 0 && !isEditorNote(note);
	return clipSentence(usable ? note : headline, max);
}
