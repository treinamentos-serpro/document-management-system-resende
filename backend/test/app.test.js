const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('contratos HTTP de documentos', async (context) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-'));
  const previousStorage = process.env.STORAGE_DIR;
  const previousLimit = process.env.MAX_FILE_SIZE_BYTES;
  process.env.STORAGE_DIR = storageDirectory;
  process.env.MAX_FILE_SIZE_BYTES = '32';
  const appPath = require.resolve('../src/app');
  delete require.cache[appPath];
  const testApp = require('../src/app');
  const server = testApp.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(storageDirectory, { recursive: true, force: true });
    if (previousStorage === undefined) delete process.env.STORAGE_DIR;
    else process.env.STORAGE_DIR = previousStorage;
    if (previousLimit === undefined) delete process.env.MAX_FILE_SIZE_BYTES;
    else process.env.MAX_FILE_SIZE_BYTES = previousLimit;
    delete require.cache[appPath];
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'X-User-Id': 'usuario-1' };
  const send = (field, content) => {
    const body = new FormData();
    body.append(field, new Blob([content]), 'relatorio.txt');
    return fetch(`${baseUrl}/upload`, { method: 'POST', headers, body });
  };

  await context.test('exige usuário antes de gravar arquivos', async () => {
    for (const endpoint of ['/documents', '/documents/ausente/download', '/upload']) {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: endpoint === '/upload' ? 'POST' : 'GET',
      });
      assert.strictEqual(response.status, 400);
      assert.strictEqual((await response.json()).error.code, 'USER_ID_REQUIRED');
    }
    assert.deepStrictEqual(await fs.readdir(storageDirectory), []);
  });

  await context.test('envia, lista e baixa somente documentos do dono', async () => {
    const empty = await fetch(`${baseUrl}/documents`, { headers });
    assert.deepStrictEqual(await empty.json(), { documents: [] });
    const response = await send('file', 'conteudo local');
    assert.strictEqual(response.status, 201);
    const document = await response.json();
    assert.deepStrictEqual(Object.keys(document).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.size, Buffer.byteLength('conteudo local'));
    assert.strictEqual(document.owner, 'usuario-1');
    assert.ok(!Number.isNaN(Date.parse(document.uploadedAt)));
    const files = await fs.readdir(storageDirectory);
    assert.strictEqual(files.length, 1);
    assert.notStrictEqual(files[0], document.originalName);
    assert.strictEqual(await fs.readFile(path.join(storageDirectory, files[0]), 'utf8'), 'conteudo local');
    const listing = await fetch(`${baseUrl}/documents`, { headers });
    assert.deepStrictEqual(await listing.json(), { documents: [document] });
    const otherHeaders = { 'X-User-Id': 'usuario-2' };
    const otherListing = await fetch(`${baseUrl}/documents`, { headers: otherHeaders });
    assert.deepStrictEqual(await otherListing.json(), { documents: [] });
    const url = `${baseUrl}/documents/${document.id}/download`;
    const denied = await fetch(url, { headers: otherHeaders });
    assert.strictEqual(denied.status, 404);
    const download = await fetch(url, { headers });
    assert.strictEqual(download.status, 200);
    assert.match(download.headers.get('content-disposition'), /attachment.*relatorio.txt/);
    assert.strictEqual(await download.text(), 'conteudo local');
    await fs.unlink(path.join(storageDirectory, files[0]));
    const missingFile = await fetch(url, { headers });
    assert.strictEqual(missingFile.status, 404);
    assert.deepStrictEqual(await missingFile.json(), await denied.json());
  });

  await context.test('rejeita arquivo ausente, campo incorreto e tamanho excedido', async () => {
    const missing = await fetch(`${baseUrl}/upload`, { method: 'POST', headers });
    assert.strictEqual(missing.status, 400);
    assert.strictEqual((await missing.json()).error.code, 'FILE_REQUIRED');
    const invalid = await send('wrong', 'arquivo');
    assert.strictEqual(invalid.status, 400);
    const large = await send('file', 'x'.repeat(40));
    assert.strictEqual(large.status, 413);
    assert.strictEqual((await large.json()).error.code, 'FILE_TOO_LARGE');
    assert.deepStrictEqual(await fs.readdir(storageDirectory), []);
  });
});
