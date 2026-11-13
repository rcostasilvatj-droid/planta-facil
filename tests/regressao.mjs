// Testes de regressão do Planta Fácil.
// Como rodar (dentro da pasta tests):   npm install   e depois   npm test
// O script sobe um servidor local, abre o app num navegador automático (Edge ou Chrome
// já instalado no computador) e repete o roteiro do CLAUDE.md em tela de computador e de celular.
// Precisa de internet na primeira carga (o three.js vem do cdnjs).
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const SAIDA = path.join(AQUI, 'saida');
fs.mkdirSync(SAIDA, { recursive: true });

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp' };
function servidor() {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(RAIZ, p);
      if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, 'localhost', () => ok(s));
  });
}

const resultados = [];
let telaAtual = '';
function confere(nome, cond, detalhe) {
  resultados.push({ tela: telaAtual, nome, ok: !!cond, detalhe: detalhe === undefined ? '' : String(detalhe) });
  console.log(`${cond ? '  ok   ' : '  FALHA'} [${telaAtual}] ${nome}${detalhe !== undefined ? ' — ' + detalhe : ''}`);
}

// Converte um ponto da planta (em metros) para a posição na tela (em pixels).
const tela = (page, x, y) => page.evaluate(([x, y]) => { const r = wrap.getBoundingClientRect(); return [r.left + (x - view.x) * view.s, r.top + (y - view.y) * view.s]; }, [x, y]);
const estado = page => page.evaluate(() => ({ walls: S.walls.length, ops: S.ops.length, stairs: S.stairs.length, furn: S.furn.length, sel, mode, is3d }));
async function clicaPlanta(page, x, y) { const [px, py] = await tela(page, x, y); await page.mouse.click(px, py); }
async function arrasta(page, x1, y1, x2, y2) {
  const a = await tela(page, x1, y1), b = await tela(page, x2, y2);
  await page.mouse.move(a[0], a[1]); await page.mouse.down();
  await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 4 }); await page.mouse.move(b[0], b[1], { steps: 4 });
  await page.mouse.up();
}
// Clica num botão do topo. No celular, alguns ficam dentro do menu "Mais": abre o menu antes.
async function topo(page, sel) {
  const b = page.locator(sel);
  if (!(await b.isVisible())) await page.locator('#bMore').click();
  await b.click();
}
const fechaModal = page => page.locator('#mClose').click();
async function abre(page, url) {
  await page.goto(url);
  await page.waitForSelector('#splash', { state: 'detached', timeout: 10000 });
  await page.waitForTimeout(150);
}

async function roteiro(browser, url, nome, opcoes) {
  telaAtual = nome;
  console.log(`\n=== ${nome} (${opcoes.viewport.width}x${opcoes.viewport.height}) ===`);
  const ctx = await browser.newContext({ ...opcoes, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  await abre(page, url);

  // --- medidas da tela ---
  const m = await page.evaluate(() => {
    const h = document.querySelector('header').getBoundingClientRect(), w = wrap.getBoundingClientRect(), a = panel.getBoundingClientRect();
    return { vh: innerHeight, vw: innerWidth, header: Math.round(h.height), desenho: Math.round(w.height), painel: Math.round(a.height), rolaPagina: document.documentElement.scrollHeight > innerHeight + 1, rolaLado: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  const pct = v => Math.round(v / m.vh * 100) + '%';
  console.log(`  medidas: topo ${m.header}px (${pct(m.header)}), desenho ${m.desenho}px (${pct(m.desenho)}), painel ${m.painel}px (${pct(m.painel)})`);
  await page.screenshot({ path: path.join(SAIDA, `${nome}-1-inicio.png`) });
  if (opcoes.isMobile) {
    confere('topo ocupa no máximo 20% da tela', m.header <= m.vh * 0.2, `${m.header}px = ${pct(m.header)}`);
    confere('desenho ocupa mais da metade da tela', m.desenho > m.vh * 0.5, `${m.desenho}px = ${pct(m.desenho)}`);
    confere('desenho inteiro visível sem rolar a página', !m.rolaPagina && !m.rolaLado);
    const fora = await page.evaluate(() => [...document.querySelectorAll('header button')].filter(b => b.offsetParent && (b.getBoundingClientRect().right > innerWidth + 1 || b.getBoundingClientRect().left < -1)).map(b => b.id || b.dataset.mode));
    confere('nenhum botão visível cortado na lateral', fora.length === 0, fora.join(','));
    const peq = await page.evaluate(() => [...document.querySelectorAll('header button')].filter(b => b.offsetParent && (b.getBoundingClientRect().height < 36 || b.getBoundingClientRect().width < 36)).map(b => b.id || b.dataset.mode));
    confere('botões visíveis com pelo menos 36px para o dedo', peq.length === 0, peq.join(','));
    // menu "Mais": abre no botão, mostra os itens e fecha ao tocar fora
    await page.locator('#bMore').click();
    const itens = ['#bImg', '#bExp', '#bImp', '#bBk', '#bReset', '#saveSt'];
    const vis = []; for (const i of itens) vis.push(await page.locator(i).isVisible());
    confere('menu Mais abre com todos os itens', vis.every(Boolean), vis.join(','));
    const dentro = await page.evaluate(() => { const r = document.querySelector('.grp.more').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; });
    confere('menu Mais cabe inteiro na tela', dentro);
    await page.screenshot({ path: path.join(SAIDA, `${nome}-1b-menu-mais.png`) });
    await clicaPlanta(page, 4.6, 7.2);
    confere('menu Mais fecha ao tocar fora', !(await page.locator('#bExp').isVisible()));
    await page.locator('#bMore').click(); await page.locator('#bMore').click();
    confere('menu Mais fecha no próprio botão', !(await page.locator('#bExp').isVisible()));
    await page.locator('[data-mode="furn"]').click();
    const mf = await page.evaluate(() => ({ h: Math.round(document.querySelector('header').getBoundingClientRect().height), d: Math.round(wrap.getBoundingClientRect().height), rola: document.documentElement.scrollHeight > innerHeight + 1 }));
    confere('modo móvel: lista aparece sem empurrar a página', !mf.rola && mf.d > m.vh * 0.5, `topo ${mf.h}px, desenho ${mf.d}px`);
    await page.screenshot({ path: path.join(SAIDA, `${nome}-1c-modo-movel.png`) });
    await page.locator('[data-mode="select"]').click();
  }

  // --- desenhar ---
  let a = await estado(page);
  await topo(page, '[data-mode="wall"]');
  await arrasta(page, 0.5, 6.8, 3.5, 6.8);
  let b = await estado(page);
  confere('desenhar parede', b.walls === a.walls + 1 && b.sel && b.sel.k === 'w', `${a.walls} → ${b.walls} paredes`);
  const idNova = b.sel && b.sel.id;

  await topo(page, '[data-mode="door"]'); await clicaPlanta(page, 1.2, 0);
  let c = await estado(page);
  confere('colocar porta', c.ops === b.ops + 1 && c.mode === 'select', `${b.ops} → ${c.ops} vãos`);
  await topo(page, '[data-mode="window"]'); await clicaPlanta(page, 0, 3);
  let d = await estado(page);
  confere('colocar janela', d.ops === c.ops + 1, `${c.ops} → ${d.ops} vãos`);
  await topo(page, '[data-mode="stair"]'); await clicaPlanta(page, 4.55, 3.5);
  let e = await estado(page);
  confere('colocar escada', e.stairs === d.stairs + 1 && e.sel && e.sel.k === 's', `${d.stairs} → ${e.stairs}`);
  await topo(page, '[data-mode="furn"]');
  confere('lista de móveis visível no modo móvel', await page.locator('#fType').isVisible());
  await page.locator('#fType').selectOption('estante');
  await clicaPlanta(page, 2, 3);
  let f = await estado(page);
  const tipoNovo = await page.evaluate(() => S.furn[S.furn.length - 1].type);
  confere('colocar móvel escolhido na lista', f.furn === e.furn + 1 && tipoNovo === 'estante', `${e.furn} → ${f.furn}, tipo ${tipoNovo}`);

  // --- mover e editar ---
  const x0 = await page.evaluate(() => S.furn[S.furn.length - 1].x);
  await arrasta(page, 2, 3, 2.6, 3.4);
  const x1 = await page.evaluate(() => S.furn[S.furn.length - 1].x);
  confere('mover móvel arrastando', Math.abs(x1 - x0 - 0.6) < 0.06, `x ${x0} → ${x1}`);
  await clicaPlanta(page, 2, 6.8);
  const selW = await page.evaluate(() => sel);
  confere('selecionar parede com clique', selW && selW.k === 'w' && selW.id === idNova, JSON.stringify(selW));
  await page.locator('#pL').fill('2,00'); await page.locator('#pL').press('Enter'); await page.locator('#pL').blur();
  const comp = id => page.evaluate(id => { const w = W(id); return w ? Math.hypot(w.x2 - w.x1, w.y2 - w.y1) : -1; }, id);
  confere('editar comprimento pelo painel', Math.abs(await comp(idNova) - 2) < 0.01, (await comp(idNova)).toFixed(2) + ' m');
  await topo(page, '#bUndo');
  confere('desfazer', Math.abs(await comp(idNova) - 3) < 0.01, (await comp(idNova)).toFixed(2) + ' m');
  await topo(page, '#bRedo');
  confere('refazer', Math.abs(await comp(idNova) - 2) < 0.01, (await comp(idNova)).toFixed(2) + ' m');

  // --- escada por cima de parede (item 3) ---
  // A parede da direita do modelo vai de (4;0) a (4;6). A escada é posta com o centro em cima dela.
  const nUndo = await page.evaluate(() => undoSt.length);
  await topo(page, '[data-mode="stair"]'); await clicaPlanta(page, 4, 4.5);
  const idEsc = (await estado(page)).sel.id;
  await page.keyboard.press('Escape');
  await clicaPlanta(page, 4, 5);
  const selEsc = await page.evaluate(() => sel);
  confere('clicar na escada por cima da parede seleciona a escada', selEsc && selEsc.k === 's' && selEsc.id === idEsc, JSON.stringify(selEsc));
  const paredesAntes = await page.evaluate(() => JSON.stringify(S.walls));
  const yEsc = await page.evaluate(id => ST(id).y, idEsc);
  await arrasta(page, 4, 5, 4, 5.5);
  const movida = await page.evaluate(([id, pa]) => ({ dy: ST(id).y, paredesIguais: JSON.stringify(S.walls) === pa }), [idEsc, paredesAntes]);
  confere('arrastar a escada por cima da parede move a escada e não a parede', Math.abs(movida.dy - yEsc - 0.5) < 0.06 && movida.paredesIguais, `y ${yEsc} → ${movida.dy}`);
  await clicaPlanta(page, 4, 0.8);
  const selFora = await page.evaluate(() => sel);
  confere('a parede continua selecionável fora da escada', selFora && selFora.k === 'w' && selFora.id === 2, JSON.stringify(selFora));
  const vaos = (await estado(page)).ops;
  await topo(page, '[data-mode="door"]'); await clicaPlanta(page, 4, 5.2);
  const porta = await page.evaluate(() => { const o = S.ops[S.ops.length - 1]; return { n: S.ops.length, wall: o.wall, type: o.type }; });
  confere('porta pode ser posta na parede embaixo da escada', porta.n === vaos + 1 && porta.wall === 2 && porta.type === 'door', JSON.stringify(porta));
  await page.evaluate(n => { while (undoSt.length > n) undo(); }, nUndo);
  await page.screenshot({ path: path.join(SAIDA, `${nome}-2a-escada-parede.png`) });

  // --- zoom ---
  const s0 = await page.evaluate(() => view.s);
  await topo(page, '#bZin'); const s1 = await page.evaluate(() => view.s);
  await topo(page, '#bZout'); await topo(page, '#bFit');
  confere('zoom e enquadrar', s1 > s0, `${s0.toFixed(1)} → ${s1.toFixed(1)}`);
  await page.screenshot({ path: path.join(SAIDA, `${nome}-2-desenho.png`) });

  // --- 3D ---
  await topo(page, '#b3d');
  await page.waitForSelector('#v3d canvas', { timeout: 8000 }).catch(() => {});
  const tem3d = await page.evaluate(() => is3d && !!T3 && !!T3.group && T3.group.children.length > 0);
  confere('abrir o 3D', tem3d);
  if (tem3d) {
    for (const v of ['noroof', 'cut', 'full']) {
      await page.locator('#v3m').selectOption(v);
      const n = await page.evaluate(() => T3.group.children.length);
      confere(`3D vista ${v}`, (await page.evaluate(() => v3dMode)) === v && n > 0, n + ' objetos');
    }
    await page.locator('#v3m').selectOption('cut');
    // procura na tela o meio de uma parede e clica nela
    const alvo = await page.evaluate(() => {
      const r = T3.renderer.domElement.getBoundingClientRect(), out = [];
      S.walls.forEach(w => { const v = new THREE.Vector3((w.x1 + w.x2) / 2, 0.6, (w.y1 + w.y2) / 2).project(T3.camera); out.push([r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]); });
      return out;
    });
    let pego = null;
    for (const [px, py] of alvo) { await page.mouse.click(px, py); pego = await page.evaluate(() => sel); if (pego) break; }
    confere('selecionar item clicando no 3D', !!pego, JSON.stringify(pego));
    await page.screenshot({ path: path.join(SAIDA, `${nome}-3-3d.png`) });
    await topo(page, '#b3d');
    confere('voltar ao 2D', !(await page.evaluate(() => is3d)) && await page.locator('#cv').isVisible());
  }

  // --- materiais ---
  await topo(page, '#bMat');
  const mat1 = await page.locator('#mRes').innerText();
  await fechaModal(page);
  await clicaPlanta(page, 2, 6.8); await page.locator('#pDel').click();
  await topo(page, '#bMat');
  const mat2 = await page.locator('#mRes').innerText();
  await fechaModal(page);
  confere('materiais mudam quando a parede muda', mat1.length > 20 && mat1 !== mat2);
  await topo(page, '#bUndo');

  // --- orçamento (item 4) ---
  await topo(page, '#bMat');
  const semPreco = await page.locator('#mOrc').innerText();
  confere('orçamento sem preços pede para informar', /Total: R\$\s?0,00/.test(semPreco) && /informe os preços/.test(semPreco), semPreco.replace(/\n/g, ' | '));
  await page.locator('#mPb').fill('1,20');
  const parcial = await page.locator('#mOrc').innerText();
  confere('orçamento parcial avisa o que falta', /parcial, falta o preço de cimento e areia/.test(parcial));
  await page.locator('#mPc').fill('R$ 38,90'); await page.locator('#mPar').fill('150');
  const esperado = await page.evaluate(() => { const r = calcMat(); return brl(Math.round(r.tij * 1.2 * 100) / 100 + Math.round(r.sacos * 38.9 * 100) / 100 + Math.round(r.areia * 150 * 100) / 100); });
  const cheio = await page.locator('#mOrc').innerText();
  confere('total do orçamento = soma de quantidade × preço', cheio.includes('Total: ' + esperado) && !/parcial|informe/.test(cheio), esperado);
  await page.locator('#mPc').fill('abc');
  const erroP = await page.locator('#mPerr').innerText(), pc = await page.evaluate(() => S.mat.pCim);
  confere('preço inválido avisa e não apaga o valor salvo', /inválido/.test(erroP) && pc === 38.9, `${erroP} / ${pc}`);
  await page.locator('#mPc').fill('38,90');
  const leit = await page.evaluate(() => ['38,90', 'R$ 38,90', '1.200', '1.200,50', '1.20', '150', '', '12a'].map(preco));
  confere('leitura de preços no formato brasileiro', JSON.stringify(leit) === JSON.stringify([38.9, 38.9, 1200, 1200.5, 1.2, 150, 0, null]), JSON.stringify(leit));
  await page.locator('#mbox').evaluate(e => e.scrollTop = 0);
  await page.screenshot({ path: path.join(SAIDA, `${nome}-4-orcamento.png`), fullPage: false });
  await page.locator('#mCp').click();
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(e => 'erro: ' + e.message);
  confere('Copiar resumo inclui preços e total', clip.includes('Orçamento') && clip.includes('× ' + await page.evaluate(() => brl(38.9))) && clip.includes('Total: ' + esperado), clip.split('\n').slice(-5).join(' | '));
  await fechaModal(page);
  const projAntigo = await page.evaluate(() => { const j = JSON.parse(JSON.stringify(S)); ['pBloco', 'pCim', 'pAreia'].forEach(k => delete j.mat[k]); const n = norm(j); return [n.mat.pBloco, n.mat.pCim, n.mat.pAreia, n.mat.trAss]; });
  confere('projeto antigo (sem preços) abre com preços em branco', JSON.stringify(projAntigo) === '[0,0,0,6]', JSON.stringify(projAntigo));

  // --- imagem de fundo (item 5) ---
  // "Planta antiga" de teste: 1000 x 600 px, com uma linha preta de 800 px (de x=100 a x=900, na altura 300).
  // Ao medir a escala dizendo que essa linha tem 4 m, a imagem inteira tem que ficar com 5 m de largura.
  const pngTeste = Buffer.from((await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 600; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 600); g.strokeStyle = '#000'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(100, 300); g.lineTo(900, 300); g.stroke(); return c.toDataURL('image/png');
  })).split(',')[1], 'base64');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), topo(page, '#bBg')]);
  await chooser.setFiles({ name: 'planta-antiga.png', mimeType: 'image/png', buffer: pngTeste });
  await page.waitForFunction(() => temFundo(), null, { timeout: 5000 }).catch(() => {});
  const fb = await page.evaluate(() => ({ tem: temFundo(), ar: S.fundo.ar, img: !!svg.querySelector('image'), guardada: !!localStorage.getItem(BG), tamS: JSON.stringify(S).length }));
  confere('carregar imagem de fundo', fb.tem && Math.abs(fb.ar - 0.6) < 0.001 && fb.img && fb.guardada, JSON.stringify(fb));
  const ordem = await page.evaluate(() => { const els = [...svg.children], im = els.findIndex(e => e.tagName === 'image'), laje = els.findIndex(e => e.getAttribute('fill') === '#fbefd9'), parede = els.findIndex(e => e.tagName === 'polygon' || (e.tagName === 'line' && e.dataset.k === 'w')); return { im, laje, parede }; });
  confere('imagem de fundo aparece por cima da laje (não fica escondida)', ordem.im > ordem.laje && ordem.im >= 0, JSON.stringify(ordem));
  confere('imagem fica fora do projeto (não pesa no salvamento)', fb.tamS < 30000 && !(await page.evaluate(() => JSON.stringify(S).includes('data:image'))), fb.tamS + ' caracteres');
  await page.locator('#bgCal').click();
  const F0 = await page.evaluate(() => ({ ...S.fundo }));
  const pa = [F0.x + 0.1 * F0.w, F0.y + 0.5 * F0.w * F0.ar], pb = [F0.x + 0.9 * F0.w, F0.y + 0.5 * F0.w * F0.ar];
  await clicaPlanta(page, ...pa); await clicaPlanta(page, ...pb);
  await page.locator('#bgReal').fill('4,00'); await page.locator('#bgApl').click();
  const F1 = await page.evaluate(() => ({ ...S.fundo, mode }));
  confere('medir escala: linha de 800 px = 4 m deixa a imagem com 5 m', Math.abs(F1.w - 5) < 0.05 && F1.mode === 'select', `largura ${F1.w.toFixed(3)} m`);
  await page.locator('#bgOp').evaluate(el => { el.value = 70; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
  const op = await page.evaluate(() => [S.fundo.op, +svg.querySelector('image').getAttribute('opacity'), JSON.parse(localStorage.getItem(KEY)).fundo.op]);
  confere('transparência ajusta a imagem e fica salva', op.every(v => Math.abs(v - 0.3) < 0.001), JSON.stringify(op));
  const paredesFundo = await page.evaluate(() => JSON.stringify(S.walls));
  await page.locator('#bgMove').click();
  await arrasta(page, 1, 1, 2, 1.5);
  const F2 = await page.evaluate(() => ({ ...S.fundo }));
  confere('mover imagem arrastando, sem mexer nas paredes', Math.abs(F2.x - F1.x - 1) < 0.05 && Math.abs(F2.y - F1.y - 0.5) < 0.05 && paredesFundo === await page.evaluate(() => JSON.stringify(S.walls)), `x ${F1.x.toFixed(2)} → ${F2.x.toFixed(2)}`);
  await page.locator('#bgMove').click();
  await page.locator('#bgW').fill('6,00'); await page.locator('#bgW').press('Enter'); await page.locator('#bgW').blur();
  confere('largura da imagem digitada', Math.abs(await page.evaluate(() => S.fundo.w) - 6) < 0.001);
  await clicaPlanta(page, 2, 0);
  const selPorCima = await page.evaluate(() => sel);
  confere('clique passa pela imagem e seleciona a parede', selPorCima && selPorCima.k === 'w', JSON.stringify(selPorCima));
  confere('imagem de fundo não entra no PNG', !(await page.evaluate(() => build(true).includes('<image'))));
  await page.screenshot({ path: path.join(SAIDA, `${nome}-5-fundo.png`) });
  await abre(page, url);
  const recarregada = await page.evaluate(() => ({ tem: temFundo(), w: S.fundo.w, img: !!svg.querySelector('image') }));
  confere('imagem de fundo continua depois de recarregar', recarregada.tem && recarregada.img && Math.abs(recarregada.w - 6) < 0.001, JSON.stringify(recarregada));
  await page.keyboard.press('Escape');
  await topo(page, '#bBg');
  await page.locator('#bgDel').click(); await page.locator('#bgDel').click();
  const removida = await page.evaluate(() => ({ tem: temFundo(), guardada: localStorage.getItem(BG), img: !!svg.querySelector('image') }));
  confere('remover imagem de fundo', !removida.tem && removida.guardada === null && !removida.img, JSON.stringify(removida));

  // --- imagem ---
  await topo(page, '#bImg');
  await page.waitForSelector('#mbox img', { timeout: 5000 }).catch(() => {});
  confere('gerar imagem PNG', (await page.locator('#mbox img').getAttribute('src').catch(() => '') || '').startsWith('data:image/png'));
  await fechaModal(page);

  // --- backup ---
  await topo(page, '#bBk');
  await page.locator('#bkN').fill('teste-auto'); await page.locator('#bkAdd').click();
  await fechaModal(page);
  const antes = await estado(page);
  await clicaPlanta(page, 2, 6.8); await page.locator('#pDel').click();
  await topo(page, '#bBk');
  const linha = page.locator('#bkL > div', { hasText: 'teste-auto' }).first().locator('[data-r]');
  await linha.click(); await linha.click();
  const depois = await estado(page);
  confere('criar e restaurar backup', depois.walls === antes.walls, `${antes.walls - 1} → ${depois.walls} paredes`);
  const salvoLocal = await page.evaluate(() => { const j = JSON.parse(localStorage.getItem(KEY)); return j.walls.length; });
  confere('projeto salvo no aparelho (localStorage)', salvoLocal === depois.walls);

  // --- exportar e abrir num navegador limpo ---
  await topo(page, '#bExp');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#dl').click()]);
  const arq = path.join(SAIDA, `${nome}-projeto.json`); await dl.saveAs(arq);
  await fechaModal(page);
  const ctx2 = await browser.newContext(opcoes), p2 = await ctx2.newPage();
  await abre(p2, url);
  const limpo = await estado(p2);
  await topo(p2, '#bImp'); await p2.locator('#file').setInputFiles(arq);
  await p2.waitForFunction(n => S.walls.length === n, depois.walls, { timeout: 5000 }).catch(() => {});
  const aberto = await estado(p2);
  confere('preços vão junto no projeto exportado', (await p2.evaluate(() => S.mat.pCim)) === 38.9);
  confere('exportar e abrir em navegador limpo', aberto.walls === depois.walls && aberto.ops === depois.ops && aberto.furn === depois.furn && aberto.stairs === depois.stairs && limpo.walls !== depois.walls, `limpo ${limpo.walls} → aberto ${aberto.walls} paredes`);
  await ctx2.close();

  // --- status de salvamento ---
  const st = await page.locator('#saveSt').textContent();
  confere('aviso de salvamento presente', st === '💾 Salvo neste aparelho', st);
  // simula o navegador recusando salvar por um erro que não é de espaço cheio, e confere que o aviso avisa
  await page.evaluate(() => { for (let i = 0; i < 5; i++) addBackup('extra ' + i); });
  const bkAntes = await page.evaluate(() => backups.length);
  await page.evaluate(() => { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('cheio'); }; });
  await topo(page, '#bUndo');
  const stErro = await page.locator('#saveSt').textContent();
  await page.evaluate(() => { Storage.prototype.setItem = window.__set; });
  await topo(page, '#bRedo');
  const stVolta = await page.locator('#saveSt').textContent();
  const bkDepois = await page.evaluate(() => [backups.length, JSON.parse(localStorage.getItem(BK) || '[]').length]);
  confere('erro que não é de espaço cheio não apaga backups', bkDepois[0] === bkAntes && bkDepois[1] === bkAntes, `${bkAntes} → ${JSON.stringify(bkDepois)}`);
  confere('aviso muda quando não consegue salvar e volta depois', /NÃO SALVO/.test(stErro) && stVolta === '💾 Salvo neste aparelho', `${stErro} → ${stVolta}`);
  confere('sem resto do código da nuvem', await page.evaluate(() => ['initCloud', 'pushCloud', 'pushBackups', 'cloud', 'bkCloud'].every(n => typeof window[n] === 'undefined' && !document.documentElement.innerHTML.includes(n + '('))));

  confere('sem erros de JavaScript', erros.length === 0, erros.join(' | '));
  return { ctx, page, paredes: depois.walls, erros };
}

// --- espaço do aparelho cheio (ajuste do item 5) ---
// Enche o localStorage com um "enchimento" até sobrar só `livre` caracteres, para simular o aparelho sem espaço.
async function encher(page, livre) {
  return page.evaluate(livre => {
    localStorage.removeItem('enchimento');
    let lo = 0, hi = 12e6;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; try { localStorage.setItem('enchimento', 'a'.repeat(m)); lo = m; } catch (e) { hi = m; } }
    localStorage.setItem('enchimento', 'a'.repeat(Math.max(0, lo - livre)));
    return lo;
  }, livre);
}
// imagem com detalhe (difícil de comprimir), para ocupar espaço de verdade
const imgTeste = async (page, w, h, seed) => Buffer.from((await page.evaluate(([w, h, seed]) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), d = g.createImageData(w, h);
  let x = seed; for (let i = 0; i < d.data.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d.data[i] = i % 4 === 3 ? 255 : x & 255; }
  g.putImageData(d, 0, 0); return c.toDataURL('image/png');
}, [w, h, seed])).split(',')[1], 'base64');
async function carregaFundo(page, buf) {
  await page.evaluate(() => { window.__id0 = S.fundo.id; const e = document.getElementById('bgErr'); if (e) e.textContent = ''; });
  const [ch] = await Promise.all([page.waitForEvent('filechooser'), page.evaluate(() => document.getElementById('fileBg').click())]);
  await ch.setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: buf });
  await page.waitForFunction(() => ((document.getElementById('bgErr') || {}).textContent || '') !== '' || window.__id0 !== S.fundo.id, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}
const salvoNoAparelho = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem(KEY)).walls.length; } catch (e) { return -1; } });
async function novaParede(page, y) { await page.evaluate(y => { push(); S.walls.push({ id: S.next++, x1: 0.5, y1: y, x2: 1.5, y2: y, t: 0.15 }); done(); }, y); }
async function alertaVisivel(page) { const a = page.locator('#alerta'); return (await a.count()) && await a.isVisible() ? (await a.innerText()) : ''; }

async function espacoCheio(browser, url, nome, opcoes) {
  telaAtual = nome;
  console.log(`\n=== ${nome}: espaço cheio ===`);
  const ctx = await browser.newContext(opcoes), page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(e.message));
  await abre(page, url);
  const st = () => page.locator('#saveSt').textContent();

  // 1) imagem não cabe: o app recusa, avisa, e o projeto continua salvando
  await encher(page, 300000);
  await carregaFundo(page, await imgTeste(page, 1200, 900, 1));
  const r1 = await page.evaluate(() => ({ tem: temFundo(), erro: (document.getElementById('bgErr') || {}).textContent || '' }));
  const al1 = await alertaVisivel(page);
  confere('imagem grande sem espaço é recusada com aviso claro', !r1.tem && /espaço/i.test(r1.erro + al1), (r1.erro || al1).slice(0, 100));
  const n1 = (await estado(page)).walls; await novaParede(page, 7.0);
  confere('depois de recusar a imagem, o projeto continua salvando', (await salvoNoAparelho(page)) === n1 + 1 && (await st()) === '💾 Salvo neste aparelho', await st());

  // 2) segunda foto grande: a primeira fica, a segunda é recusada, o projeto continua salvando
  await page.evaluate(() => localStorage.removeItem('enchimento'));
  await carregaFundo(page, await imgTeste(page, 1200, 900, 2));
  const id1 = await page.evaluate(() => temFundo() && S.fundo.id);
  confere('primeira foto carrega com espaço livre', !!id1, String(id1));
  await encher(page, 100000);
  await carregaFundo(page, await imgTeste(page, 1300, 1000, 3));
  const r2 = await page.evaluate(() => ({ tem: temFundo(), id: S.fundo.id, erro: (document.getElementById('bgErr') || {}).textContent || '' }));
  confere('segunda foto grande é recusada e a primeira continua', r2.tem && r2.id === id1 && /espaço/i.test(r2.erro + await alertaVisivel(page)), `${r2.tem} ${r2.id === id1} ${r2.erro.slice(0, 80)}`);
  const n2 = (await estado(page)).walls; await novaParede(page, 7.1);
  confere('com a primeira foto e pouco espaço, o projeto continua salvando', (await salvoNoAparelho(page)) === n2 + 1 && (await st()) === '💾 Salvo neste aparelho', await st());

  // 3) espaço acaba de vez: o aviso NÃO pode dizer "Salvo"; tem que aparecer na tela; e some quando volta a salvar
  await page.evaluate(() => { backups = backups.slice(0, 2); saveBackups(); });
  await encher(page, 0);
  const n3 = await salvoNoAparelho(page);
  for (let i = 0; i < 3; i++) await novaParede(page, 7.2 + i * 0.05);
  const st3 = await st(), al3 = await alertaVisivel(page);
  confere('sem espaço nenhum o aviso não diz "Salvo"', !/^💾 Salvo/.test(st3) && (await salvoNoAparelho(page)) === n3, st3);
  const vis3 = await page.evaluate(() => { const a = document.getElementById('alerta'); if (!a) return false; const r = a.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; });
  confere('aviso de "não salvou" aparece na tela (sem abrir menu)', vis3 && /não está sendo salvo/i.test(al3), al3.slice(0, 100));
  await page.screenshot({ path: path.join(SAIDA, `${nome}-6-espaco-cheio.png`) });
  await page.evaluate(() => localStorage.removeItem('enchimento'));
  await novaParede(page, 7.4);
  confere('quando o espaço volta, salva e o aviso some', (await salvoNoAparelho(page)) === (await estado(page)).walls && (await st()) === '💾 Salvo neste aparelho' && !(await alertaVisivel(page)), await st());

  // 4) pouco espaço com muitos backups: o app apaga backups antigos para salvar o projeto, e avisa
  await page.evaluate(() => { localStorage.removeItem(BG); S.fundo = fundoDef(); for (let i = 0; i < 14; i++) addBackup('b' + i); });
  const nb = await page.evaluate(() => backups.length);
  await encher(page, 0);
  for (let i = 0; i < 6; i++) await novaParede(page, 6.6 - i * 0.05);
  const r4 = await page.evaluate(() => backups.length), al4 = await alertaVisivel(page);
  confere('pouco espaço: apaga backups antigos, salva o projeto e avisa', (await salvoNoAparelho(page)) === (await estado(page)).walls && r4 < nb && /backups/i.test(al4), `backups ${nb} → ${r4}; ${al4.slice(0, 70)}`);
  await page.evaluate(() => localStorage.removeItem('enchimento'));
  confere('sem erros de JavaScript (espaço cheio)', erros.length === 0, erros.join(' | '));
  await ctx.close();

  // 5) navegador que recusa salvar desde o início (ex.: modo privado antigo): não pode dizer "Salvo"
  const ctx2 = await browser.newContext(opcoes);
  await ctx2.addInitScript(() => { Storage.prototype.setItem = function () { throw new Error('bloqueado'); }; });
  const p2 = await ctx2.newPage(); await abre(p2, url);
  const st5 = await p2.locator('#saveSt').textContent();
  confere('ao abrir sem conseguir salvar, o aviso não diz "Salvo"', !/^💾 Salvo/.test(st5) && !!(await alertaVisivel(p2)), st5);
  await ctx2.close();
}

async function offline(r, srv, url) {
  const { ctx, page } = r;
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 10000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500); // tempo para o service worker terminar de guardar os arquivos
  await ctx.setOffline(true);
  await new Promise(ok => { srv.closeAllConnections && srv.closeAllConnections(); srv.close(ok); });
  let abriu = true;
  try { await page.reload({ timeout: 10000 }); await page.waitForSelector('#splash', { state: 'detached', timeout: 10000 }); } catch (e) { abriu = false; }
  const info = abriu ? await page.evaluate(() => ({ walls: typeof S !== 'undefined' ? S.walls.length : -1, three: !!window.THREE })) : { walls: -1, three: false };
  confere('recarregar sem internet abre o app e o projeto', abriu && info.walls === r.paredes, `paredes ${info.walls}`);
  confere('3D disponível sem internet (three.js guardado)', info.three);
  if (abriu && info.three) { await topo(page, '#b3d'); confere('abrir 3D sem internet', await page.evaluate(() => is3d && !!T3)); }
}

const TELAS = {
  computador: { viewport: { width: 1280, height: 800 } },
  celular: { viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 }
};

let browser;
for (const channel of ['msedge', 'chrome']) { try { browser = await chromium.launch({ channel }); break; } catch (e) {} }
if (!browser) { console.error('Não achei o Edge nem o Chrome instalados.'); process.exit(2); }

for (const [nome, op] of Object.entries(TELAS)) {
  const srv = await servidor();
  const url = `http://localhost:${srv.address().port}/`;
  try {
    const r = await roteiro(browser, url, nome, op);
    await espacoCheio(browser, url, nome, op);
    await offline(r, srv, url);
    await r.ctx.close();
  } catch (e) { confere('roteiro terminou sem travar', false, e.message.split('\n')[0]); }
  if (srv.listening) srv.close();
}
await browser.close();

const falhas = resultados.filter(r => !r.ok);
console.log(`\nResumo: ${resultados.length - falhas.length} de ${resultados.length} conferências passaram.`);
falhas.forEach(f => console.log(`  FALHA [${f.tela}] ${f.nome} ${f.detalhe}`));
process.exit(falhas.length ? 1 : 0);
