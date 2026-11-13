// Teste de atualização: simula um aparelho que já usava a versão publicada (branch main) e recebe a versão nova.
// Como rodar (dentro da pasta tests):   node atualizacao.mjs            (compara origin/main com a pasta atual)
//                                       node atualizacao.mjs <ref>      (compara outra versão do git com a pasta atual)
// 1. Tira do git os arquivos da versão antiga e serve no mesmo endereço que a versão nova vai usar
//    (o navegador separa os dados por endereço: tem que ser o mesmo para o projeto ser o mesmo).
// 2. Abre a versão antiga, cria um projeto com mudanças e um backup, com o service worker antigo instalado.
// 3. Troca os arquivos do servidor pela versão nova e recarrega, como acontece depois de publicar.
// 4. Confere que o projeto e o backup abrem certos, com os campos novos completados pelo norm().
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const NOVA = path.resolve(AQUI, '..');
const SAIDA = path.join(AQUI, 'saida');
const REF = process.argv[2] || 'origin/main';
const ANTIGA = path.join(SAIDA, 'versao-antiga');

// arquivos da versão antiga, direto do git (sem mexer na pasta de trabalho)
fs.rmSync(ANTIGA, { recursive: true, force: true });
const git = (...a) => execFileSync('git', a, { cwd: NOVA, maxBuffer: 64 * 1024 * 1024 });
for (const f of git('ls-tree', '-r', '--name-only', REF).toString().split('\n').filter(Boolean)) {
  const dst = path.join(ANTIGA, f); fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, git('show', `${REF}:${f}`));
}
const versao = raiz => (fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8').match(/planta-facil-v\d+/) || ['?'])[0];
console.log(`Versão antiga (${REF}): ${versao(ANTIGA)}   →   versão nova (pasta atual): ${versao(NOVA)}`);

let raiz = ANTIGA; // o servidor serve a pasta que estiver aqui
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(raiz, p);
  if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(f).pipe(res);
}).listen(0, 'localhost');
await new Promise(ok => srv.on('listening', ok));
const url = `http://localhost:${srv.address().port}/`;

const resultados = [];
let tela = '';
function confere(nome, cond, detalhe) {
  resultados.push({ tela, nome, ok: !!cond, detalhe: detalhe === undefined ? '' : String(detalhe) });
  console.log(`${cond ? '  ok   ' : '  FALHA'} [${tela}] ${nome}${detalhe !== undefined ? ' — ' + detalhe : ''}`);
}
const espera = page => page.waitForSelector('#splash', { state: 'detached', timeout: 15000 });

let browser;
for (const channel of ['msedge', 'chrome']) { try { browser = await chromium.launch({ channel }); break; } catch (e) {} }
if (!browser) { console.error('Não achei o Edge nem o Chrome instalados.'); process.exit(2); }

const TELAS = {
  computador: { viewport: { width: 1280, height: 800 } },
  celular: { viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 }
};
for (const [nome, op] of Object.entries(TELAS)) {
  tela = nome; raiz = ANTIGA;
  console.log(`\n=== ${nome} ===`);
  const ctx = await browser.newContext(op), page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(e.message));
  try {
    // --- versão antiga: projeto com mudanças, um backup e mais mudanças depois dele ---
    await page.goto(url); await espera(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await espera(page);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
    const antes = await page.evaluate(() => {
      push();
      S.walls.push({ id: S.next++, x1: 0.5, y1: 6.8, x2: 3.5, y2: 6.8, t: 0.12 });
      S.stairs.push({ id: S.next++, x: 4.5, y: 3, w: 0.8, l: 3, n: 15, h: 2.8, rot: 0 });
      S.wallH = 2.9; S.mat.tipo = '9x14x19'; S.roof.caim = 12;
      done();
      addBackup('Backup de teste da versão antiga');
      push(); S.walls.push({ id: S.next++, x1: 0.5, y1: 1, x2: 2, y2: 1, t: 0.15 }); done();
      return {
        cache: null, walls: S.walls.map(w => w.id), stairs: S.stairs.length, furn: S.furn.length, wallH: S.wallH, tipo: S.mat.tipo, caim: S.roof.caim,
        bkWalls: JSON.parse(backups.find(b => b.nome === 'Backup de teste da versão antiga').json).walls.length, nbk: backups.length
      };
    });
    antes.cache = await page.evaluate(() => caches.keys());
    confere('versão antiga: projeto e backup criados', antes.walls.length === 6 && antes.bkWalls === 5, `${antes.walls.length} paredes; backup com ${antes.bkWalls}; cache ${antes.cache}`);

    // --- publica a versão nova no mesmo endereço e o aparelho recarrega ---
    raiz = NOVA;
    await page.reload(); await espera(page);
    // o navegador acha o sw.js novo, instala e troca; depois disso ainda pode faltar um recarregar
    // espera até 20 s o service worker novo terminar (o cache antigo some quando ele assume)
    for (let t = 0; t < 40; t++) { const k = await page.evaluate(() => caches.keys()); if (k.length === 1 && k[0] === versao(NOVA)) break; await page.waitForTimeout(500); }
    const aviso = await page.locator('#saveSt').textContent().catch(() => '');
    const cachesNovos = await page.evaluate(() => caches.keys());
    confere('service worker novo instalado e cache antigo apagado', cachesNovos.length === 1 && cachesNovos[0] === versao(NOVA), cachesNovos.join(', '));
    confere('versão nova abre logo no primeiro recarregar', await page.evaluate(() => typeof acabDef === 'function' && typeof andar === 'function'));
    if (/Nova versão/.test(aviso)) console.log('         (aviso mostrado: ' + aviso + ')');
    await page.reload(); await espera(page);

    const depois = await page.evaluate(() => ({
      walls: S.walls.map(w => w.id), stairs: S.stairs.length, furn: S.furn.length, wallH: S.wallH, tipo: S.mat.tipo, caim: S.roof.caim,
      nivel: S.nivel, outro: S.outro, acab: S.acab, fundo: S.fundo, precos: [S.mat.pBloco, S.mat.pCim, S.mat.pAreia],
      nbk: backups.length, st: document.getElementById('saveSt').textContent
    }));
    confere('projeto da versão antiga abre igual na nova', depois.walls.join() === antes.walls.join() && depois.stairs === antes.stairs && depois.furn === antes.furn && depois.wallH === 2.9 && depois.tipo === '9x14x19' && depois.caim === 12, `${depois.walls.length} paredes, ${depois.stairs} escada, pé-direito ${depois.wallH}`);
    confere('norm() completa os campos novos', depois.nivel === 'laje' && depois.outro.walls.length === 0 && depois.acab.paredeTex === 'liso' && depois.fundo.id === null && depois.precos.join() === '0,0,0', JSON.stringify({ nivel: depois.nivel, acab: depois.acab.paredeTex, precos: depois.precos }));
    confere('backups da versão antiga continuam na lista', depois.nbk >= antes.nbk, `${antes.nbk} → ${depois.nbk}`);
    confere('versão nova salva o projeto', /Salvo neste aparelho/.test(depois.st), depois.st);

    // restaura o backup antigo pela tela de Backups (dois toques: Restaurar e Confirmar)
    if (!(await page.locator('#bBk').isVisible())) await page.locator('#bMore').click();
    await page.locator('#bBk').click();
    const linha = page.locator('#bkL > div', { hasText: 'Backup de teste da versão antiga' }).first();
    await linha.locator('[data-r]').click(); await linha.locator('[data-r]').click();
    const rest = await page.evaluate(() => ({ walls: S.walls.length, nivel: S.nivel, acab: !!S.acab, salvo: JSON.parse(localStorage.getItem(KEY)).walls.length }));
    confere('backup feito na versão antiga restaura na nova', rest.walls === antes.bkWalls && rest.nivel === 'laje' && rest.acab && rest.salvo === antes.bkWalls, `${rest.walls} paredes`);

    // o resto do app funciona com o projeto atualizado
    const usa = await page.evaluate(() => { const m = calcMat(); toggle3d(true); const ok3d = !!(T3 && T3.group && T3.group.children.length); toggle3d(false); trocaAndar('terreo'); trocaAndar('laje'); return { mat: m && m.liq > 0, ok3d }; });
    confere('materiais, 3D e troca de andar funcionam no projeto atualizado', usa.mat && usa.ok3d, JSON.stringify(usa));

    // sem internet, abre a versão nova com o projeto
    await ctx.setOffline(true);
    await page.reload(); await espera(page);
    const off = await page.evaluate(() => ({ nova: typeof andar === 'function', walls: S.walls.length }));
    confere('sem internet abre a versão nova com o projeto', off.nova && off.walls === antes.bkWalls, JSON.stringify(off));
    await ctx.setOffline(false);
    await page.screenshot({ path: path.join(SAIDA, `${nome}-atualizacao.png`) });
    confere('sem erros de JavaScript', erros.length === 0, erros.join(' | '));
  } catch (e) { confere('teste terminou sem travar', false, e.message.split('\n')[0]); }
  await ctx.close();
}
await browser.close(); srv.close();
const falhas = resultados.filter(r => !r.ok);
console.log(`\nResumo: ${resultados.length - falhas.length} de ${resultados.length} conferências passaram.`);
process.exit(falhas.length ? 1 : 0);
