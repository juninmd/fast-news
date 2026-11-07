import { describe, expect, it, vi } from "vitest";
import {
	extractArticleFromHtmlContent,
	extractArticleText,
	fetchFullArticle,
} from "./fullArticle.js";

describe("fullArticle", () => {
	it("extracts clean article text from HTML via digest-kit", () => {
		const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Novo avanço em inteligência artificial</title></head>
        <body>
          <nav><a href="/">Home</a><a href="/login">Login</a></nav>
          <article>
            <h1>Novo avanço em inteligência artificial</h1>
            <p>Pesquisadores anunciaram hoje um modelo inovador capaz de processar dados em tempo real com alta fidelidade.</p>
            <p>Os testes demonstraram ganhos significativos em eficiência energética e precisão em tarefas analíticas complexas.</p>
          </article>
          <footer>Todos os direitos reservados</footer>
        </body>
      </html>
    `;

		const text = extractArticleFromHtmlContent(html);
		expect(text).toContain("Pesquisadores anunciaram hoje um modelo inovador");
		expect(text).toContain("eficiência energética");
		expect(text).not.toContain("Login");
		expect(text).not.toContain("Todos os direitos reservados");
	});

	it("extracts text correctly via extractArticleText", () => {
		const md = `
# Título da Notícia

Primeiro parágrafo informativo sobre o evento ocorrido na cidade.

Segundo parágrafo detalhando os participantes e decisões tomadas.

Leia também:
Outra notícia irrelevante
    `;
		const res = extractArticleText(md);
		expect(res).toContain("Primeiro parágrafo informativo");
		expect(res).not.toContain("Leia também");
	});
});
