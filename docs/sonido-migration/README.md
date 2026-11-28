# Troca dos componentes locais pelo Sonido

O fast-news mantinha primitivos próprios no front React que o
[`@juninmd/sonido`](https://github.com/juninmd/sonido) já publica. Esta pasta guarda a comparação lado a lado usada na
revisão da troca.

| Componente     | Antes (fast-news)                                                                 | Depois (`@juninmd/sonido`)                                                          |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CategoryTabs` | tablist próprio com `useLayoutEffect` medindo a barra de tinta                    | `Tabs` (`variant="underline"`): setas, Home/End e a barra ativa                      |
| `SkeletonCard` | quatro `div.skeleton` + mídia, sem anúncio para leitores de tela                   | `Skeleton` com `rows`, `media` e região `role="status"`                             |
| `EmptyState`   | função local no `AppNeo` (título + frase, sem ícone)                              | `EmptyState` com ícone, título (`h2`), descrição e ação opcional                     |
| `Toast`        | `div.pulso-toast` com `role="status"` e um `setTimeout` no `AppNeo`                | `ToastProvider`/`useToast`: região `aria-live`, barra de tempo, pausa no hover e close |
| `Kbd`          | `kbd.pulso-kbd` estilizado no CSS do app                                          | `Kbd` (tecla 3D com contraste do tema)                                              |
| `Badge`        | `span.pulso-badge` com cor/fonte fixas no CSS do app                              | `Badge` (`tone="accent"`, `appearance="solid"`)                                     |
| `StatTile`     | card de dependência inline no `StatusPanel` (nome, estado e latência)             | `StatTile` com `label`, `value`, `hint` e `tone`                                    |

Arquivos tocados: `src/components/NeoEditorial/{CategoryTabs,SkeletonCard,EmptyState,StatusPanel}.tsx`,
`src/components/Pulso/Rail.tsx`, `src/AppNeo.tsx`, `src/main.jsx`, `src/hooks/useTheme.ts`, `index.html`,
`src/styles/{pulso,aurora}.css`.

## Tema

O app pinta o tema por `class="dark"` e por variáveis `--bg-*`; o Sonido lê `data-theme`. O
`useTheme` agora escreve os dois (`dark` → `dark`, `light` → `light`), e o `index.html` nasce com
`data-theme="dark"` para não piscar. Nenhum token interno do Sonido foi sobrescrito.

As únicas pontes são de encaixe, todas comentadas no CSS:

- `.pulso-cats-sonido`: margem inferior das abas no feed.
- `.pulso-skeleton-card`: a linha do feed (padding e borda) que o `Skeleton` preenche.
- `.pulso-cmdk-kbd`: empurra a tecla `⌘K` para a direita na barra de busca.
- `.pulso-rail-count` / `.pulso-count-badge`: posição absoluta dos contadores sobre o ícone.

## Comparações

As capturas (`antes-depois-dark.png`, `antes-depois-light.png`) foram geradas antes do merge, em Chromium 1180×900 (`deviceScaleFactor: 2`, `fullPage`), com dados fictícios. O harness que montava os dois lados (`preview*` e as cópias em `legacy/`) foi removido depois da revisão; as imagens ficam como registro da troca.

