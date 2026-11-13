# Planta Fácil

Aplicativo web instalável para desenhar plantas baixas, ver a casa em 3D e calcular lajotas, cimento e areia.

**by Ricardo Silva**

[Abrir o Planta Fácil](https://rcostasilvatj-droid.github.io/planta-facil/)

## Diretrizes de uso

- No Android, abra o link no Chrome e toque em **Instalar app**. No iPhone ou iPad, abra no Safari e use **Compartilhar → Adicionar à Tela de Início**.
- Depois da primeira abertura online, o app pode funcionar offline. Projetos, backups e preferências ficam armazenados localmente no aparelho.
- Para trocar de aparelho, use **💾 Exportar projeto** e abra o arquivo no aparelho de destino em **📂 Abrir projeto**. Abrir um projeto substitui o projeto atual, e o app guarda um backup antes (veja **🕘 Backups**).
- Os cálculos de materiais e as medidas de escada são estimativas para orçamento. Não substituem o projeto nem a avaliação de um engenheiro ou responsável técnico, principalmente em obras sobre laje.
- Ao relatar problemas no GitHub, evite incluir plantas de imóveis de terceiros, endereços ou outras informações pessoais.

## Código aberto e manutenção oficial

O código é distribuído sob a [licença MIT](LICENSE). Você pode copiar o projeto, criar um fork e modificar ou distribuir sua própria versão, mantendo os avisos exigidos pela licença.

Ricardo Silva é o único mantenedor da versão oficial. Sugestões podem ser enviadas por Issues, mas a decisão de incorporar mudanças e a publicação da versão oficial cabem exclusivamente a Ricardo. Forks são versões independentes e não alteram este repositório.

O 3D usa a biblioteca [three.js](https://github.com/mrdoob/three.js), também sob licença MIT.

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
| `icons/` | Ícones do app (arte de Ricardo Silva) |
| `splash.webp` | Tela de abertura (arte de Ricardo Silva) |
| `LICENSE` | Licença MIT |
| `CLAUDE.md` | Regras de trabalho para o Claude Code neste repositório |
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
- O app não tem servidor nem sincronização na nuvem: o projeto e os backups ficam só no `localStorage` do aparelho, e o topo mostra "💾 Salvo neste aparelho". Se o navegador recusar salvar (memória cheia, modo anônimo), o aviso muda para "⚠️ Não consegui salvar neste aparelho". O antigo código de sincronização com a nuvem do Claude (`initCloud`, `pushCloud`, `pushBackups`, `window.claude`) foi removido porque fora do Claude não fazia nada.
- No celular (tela até 760 px de largura), o topo vira um menu compacto: duas fileiras de botões com ícone e nome, a lista de móveis só aparece no modo "Colocar móvel" e imagem, exportar, abrir, backups e o aviso de salvamento ficam no menu **☰ Mais**. É feito só com CSS (`@media`) sobre os mesmos botões; no computador nada muda.

## Testes

A pasta `tests/` tem o roteiro de regressão automático (não faz parte do app). Precisa do Node.js e do Edge ou Chrome instalados:

```
cd tests
npm install
npm test
```

Ele sobe um servidor local e repete o roteiro em tela de computador (1280x800) e de celular (412x860), inclusive recarregar sem internet. As capturas de tela ficam em `tests/saida/`.
