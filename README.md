# Planta Fácil

Editor de planta baixa que roda no navegador e pode ser instalado como app (PWA) no celular e no computador.

by Ricardo Silva — Rimivo

## O que faz

- Desenha paredes, portas, janelas, escadas e móveis (mesa com computador, cadeira, sofá, rack com TV, estante, planta).
- Varanda com guarda-corpo e telhado embutido (platibanda).
- Visualização em 3D, com as vistas: casa completa, sem telhado e por dentro.
- Calcula lajotas/tijolos, cimento e areia das paredes, incluindo a platibanda.
- Backups automáticos e manuais, com restauração.
- Funciona sem internet depois da primeira abertura.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O app inteiro (HTML, CSS e JavaScript num arquivo só) |
| `manifest.webmanifest` | Nome, ícones e cores do app instalado (PWA) |
| `sw.js` | Service worker: guarda os arquivos para funcionar offline |
| `icons/` | Ícones do app |
| `.nojekyll` | Faz o GitHub Pages servir os arquivos sem processar |

## Onde os dados ficam

- O projeto fica salvo **no navegador de cada aparelho** (localStorage). Não há servidor.
- Para levar de um aparelho para outro: **💾 Exportar projeto** → **Enviar arquivo** ou **Baixar arquivo**, e no outro aparelho **📂 Abrir projeto**.
- Antes de abrir um projeto, o app guarda um backup do projeto atual (veja **🕘 Backups**).

## Publicar no GitHub Pages

1. No repositório, vá em **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
3. Depois de 1 a 2 minutos o app fica em `https://<usuario>.github.io/planta-facil/`.

## Publicar uma nova versão

Ao mudar qualquer arquivo, aumente a versão em `sw.js` (`planta-facil-v1` → `planta-facil-v2`).
Assim os aparelhos baixam a versão nova e mostram o aviso "Nova versão instalada — toque aqui para recarregar".

## Observações técnicas

- O 3D usa three.js r128, carregado do cdnjs e guardado pelo service worker para uso offline.
- O código de sincronização com a nuvem do Claude continua no arquivo, mas só funciona dentro do Claude. No GitHub Pages ele mostra "💾 Salvo só neste aparelho".
- Os cálculos de materiais são estimativas para orçamento, não substituem projeto de engenheiro.
