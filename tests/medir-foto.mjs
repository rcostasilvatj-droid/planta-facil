// Mede quanto espaço uma foto ocupa no Planta Fácil depois que o app reduz e comprime.
// Uso (dentro da pasta tests):   node medir-foto.mjs "C:\caminho\da\foto.jpg"
// Abre o app num navegador automático, carrega a foto como imagem de fundo do mesmo jeito que você faria
// e mostra o tamanho guardado. Nada é enviado para a internet; o navegador usado é descartado no fim.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const foto = process.argv[2];
if (!foto || !fs.existsSync(foto)) { console.error('Informe o caminho de uma foto. Exemplo: node medir-foto.mjs "C:\\Fotos\\planta.jpg"'); process.exit(2); }
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, 'localhost');
await new Promise(ok => srv.on('listening', ok));

let browser;
for (const channel of ['msedge', 'chrome']) { try { browser = await chromium.launch({ channel }); break; } catch (e) {} }
const page = await (await browser.newContext()).newPage();
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForSelector('#splash', { state: 'detached' });
const [ch] = await Promise.all([page.waitForEvent('filechooser'), page.evaluate(() => document.getElementById('fileBg').click())]);
await ch.setFiles(foto);
await page.waitForFunction(() => temFundo() || ((document.getElementById('bgErr') || {}).textContent || '') !== '', null, { timeout: 30000 });
const r = await page.evaluate(() => {
  const j = JSON.parse(localStorage.getItem(BG) || 'null'), img = new Image();
  return new Promise(ok => { if (!j) return ok({ erro: (document.getElementById('bgErr') || {}).textContent }); img.onload = () => ok({ chars: j.data.length, w: img.naturalWidth, h: img.naturalHeight }); img.src = j.data; });
});
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`Foto original: ${kb(fs.statSync(foto).size)}`);
if (r.erro) console.log('O app recusou a foto: ' + r.erro);
else console.log(`Guardada pelo app: ${r.w} x ${r.h} px, ocupa ${kb(r.chars)} do armazenamento (limite do app: 781 KB; o navegador guarda uns 5.000 KB no total).`);
await browser.close(); srv.close();
