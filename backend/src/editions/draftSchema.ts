import { z } from "zod";

// Deliberately lenient: sizes and id validity are enforced by sanitizeDraft,
// so a model that returns 4 destaques instead of 3 does not fail the edition.
// Numbers are coerced because pool models often quote ids and indexes.
const id = z.coerce.number().int();
const ids = z.array(id).default([]);
const text = z.string().default("");

const story = z.object({
	chapeu: z.string().optional(),
	titulo: z.string(),
	texto: text,
	fontes: ids,
});

// The edition is generated in three calls so each output stays small enough
// for the free LiteLLM backends, which time out long structured answers.
export const frontSchema = z.object({
	manchete: story.extend({
		linhaFina: text,
		paragrafos: z.array(z.string()).default([]),
		citacao: z.object({ texto: z.string(), autor: z.string() }).optional(),
	}),
	destaques: z.array(story).default([]),
});

export const sectionsSchema = z.object({
	secoes: z
		.array(
			z.object({
				nome: z.string(),
				materias: z.array(story).default([]),
				notas: z.array(z.string()).default([]),
			}),
		)
		.default([]),
});

export const extrasSchema = z.object({
	fio: z
		.array(
			z.object({
				tema: z.string(),
				eventos: z
					.array(z.object({ fonte: id, texto: z.string() }))
					.default([]),
			}),
		)
		.default([]),
	numeros: z
		.array(
			z.object({ rotulo: z.string(), valor: z.coerce.string(), nota: text }),
		)
		.default([]),
	leve: z.array(z.string()).default([]),
	quiz: z
		.array(
			z.object({
				pergunta: z.string(),
				opcoes: z.array(z.coerce.string()),
				correta: id,
			}),
		)
		.default([]),
});
