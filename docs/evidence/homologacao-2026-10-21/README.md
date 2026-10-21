# Homologação com as notícias do dia — 21/10/2026

Teste do gerador de edições (O Fio) sobre os feeds reais das últimas 24 horas.

## Escopo e limites

- Ingestor real (`fetchFeed`) sobre os 214 feeds de `sources.ts`: 154 responderam, 60 falharam ou vieram vazios.
- 3.699 itens lidos; 1.223 publicados nas últimas 24h, de 95 fontes.
- `buildEdition` e os renderizadores reais, com banco e LLM simulados. **Não** cobre Postgres, embeddings, IA real nem envio ao Telegram; isso continua em `scripts/homolog.ps1`.
- Cenário A: todas as chamadas de IA falham (rota de contingência sobre todas as notícias).
- Cenário B: modelo com defeito, repetindo a manchete nos destaques e duplicando a seção "Brasil".
- Dados completos em `report.json`.

## Resultado final

| Verificação | A (sem IA) | B (modelo repetindo) |
|---|---|---|
| Notícias elegíveis | 1.175 | 1.175 |
| Ausentes da edição | 0 | 0 |
| Matérias publicadas | 1.141 | 1.141 |
| Títulos duplicados / quase duplicados | 0 / 0 | 0 / 0 |
| Links no total / inválidos | 1.175 / 0 | 1.175 / 0 |
| Fontes sem link | 0 | 0 |
| Títulos terminando em "…" | 0 | 0 |
| Seções com título repetido | 0 | 0 |
| Resumo do Telegram dentro de 4.096 caracteres | sim | sim |

As 19 URLs que não aparecem no markdown são filtros intencionais: promoções, loterias, horóscopo, "como ativar", e fact-checks além dos 4 mais recentes.

## Falhas encontradas pela homologação

1. **Links perdidos em notícias repetidas.** Ao descartar uma repetida, a edição descartava as fontes dela (matéria do presidente do Vasco saía só com a CNN Brasil, sem InfoMoney e Exame). Agora a matéria mantida incorpora as fontes, até 4.
2. **Mesmo título em outro site era descartado.** Netflix saía na CNN Brasil e a InfoMoney sumia. Agora só se descarta o mesmo título no mesmo site; as duas fontes ficam juntas.
3. **Filtro "oferta" removia notícia real.** "Irã diz que Arábia Saudita não respondeu oferta de mediação" era tratada como promoção. O filtro passou a exigir contexto de compra.
4. Limite de título de 160 para 240 caracteres: dois títulos longos em inglês ainda saíam cortados.

## Observações

- Dos 13 grupos de notícias do dia, alguns juntam notícias relacionadas mas não idênticas (ex.: "Round Up" de reviews com a review do mesmo jogo). Os dois links aparecem.
- Só os 4 fact-checks mais recentes entram na edição (comportamento anterior, não alterado).
