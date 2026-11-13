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
- Imagem de fundo: carregue uma foto ou planta antiga (**☰ Mais → 🗺 Imagem de fundo**) para desenhar por cima, com transparência, largura, **Mover imagem** e **Medir escala** (toque nas duas pontas de uma medida conhecida e digite o valor real).
- Visualização em 3D, com as vistas: casa completa, sem telhado e por dentro.
- Calcula lajotas/tijolos, cimento e areia das paredes, incluindo a platibanda.
- Orçamento: você digita o preço da lajota, do saco de cimento e do m³ de areia, e o app mostra o valor de cada item e o total. **Copiar resumo** leva os valores junto.
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
- Ordem de clique no desenho 2D: no SVG, o que é desenhado por último fica por cima e recebe o toque. As áreas de clique invisíveis seguem a ordem paredes → escadas → portas e janelas → móveis → bolinhas das pontas da parede selecionada. Assim, onde uma escada cobre uma parede, o toque pega a escada. Nos modos Porta e Janela as escadas não recebem o toque, para dar para pôr uma porta na parede que está embaixo.
- Preços do orçamento: ficam em `S.mat` (`pBloco`, `pCim`, `pAreia`, em reais; 0 = não informado), então vão junto ao exportar o projeto. Projetos antigos recebem 0 pelo `norm()`. O app não busca nem sugere preços. O total é quantidade comprada × preço: lajotas e sacos já arredondados para cima, areia pelos m³ calculados. Não inclui frete nem mão de obra. Os campos aceitam "38,90", "R$ 38,90" e "1.200" (mil e duzentos).
- Imagem de fundo: a imagem é reduzida para no máximo 2000 px (JPEG qualidade 0,75; se passar de 800 mil caracteres, tenta 1600 px e depois 1200 px) e guardada numa chave separada do `localStorage` (`...-fundo`), com um id. Em `S.fundo` ficam só os ajustes (`id`, `on`, `x`, `y`, `w` em metros, `ar` = altura/largura, `op` = opacidade). Motivo: uma foto tem centenas de KB, e dentro de `S` ela seria copiada em cada backup e em cada passo do desfazer, estourando o limite de cerca de 5 MB do navegador. Consequências: a imagem não vai no projeto exportado nem no PNG, e só aparece quando o id bate com o do projeto aberto. PDF não é aceito; tire um print da planta.
- Espaço cheio: o navegador guarda cerca de 5 milhões de caracteres por site, e o projeto sempre tem prioridade. Uma imagem de fundo só é aceita se, depois de guardada, ainda sobrarem 600 mil caracteres livres. Se não couber, a imagem anterior continua e aparece um aviso. Se o projeto não couber ao salvar, o app apaga os backups mais antigos (ficam os 3 mais novos) e avisa na tela. Isso só acontece quando o erro é mesmo de espaço cheio. Se ainda assim não salvar, uma faixa vermelha por cima do desenho diz que o projeto **não** está sendo salvo, e o aviso do topo troca "💾 Salvo neste aparelho" por "⚠️ NÃO SALVO". Ao abrir, o app faz uma gravação de teste, então o aviso só diz "Salvo" se o navegador aceitou salvar de verdade.

## Testes

A pasta `tests/` tem o roteiro de regressão automático (não faz parte do app). Precisa do Node.js e do Edge ou Chrome instalados:

```
cd tests
npm install
npm test
```

Ele sobe um servidor local e repete o roteiro em tela de computador (1280x800) e de celular (412x860), inclusive recarregar sem internet. As capturas de tela ficam em `tests/saida/`.

Para ver quanto uma foto sua ocupa no app depois de reduzida:

```
cd tests
node medir-foto.mjs "C:\caminho\daoto.jpg"
```
