const service = require('../services/documentService');

function requireUser(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner) {
    return res.status(400).json({
      error: { code: 'USER_ID_REQUIRED', message: 'O cabeçalho X-User-Id é obrigatório.' },
    });
  }
  req.documentOwner = owner;
  return next();
}

async function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo "file".' },
    });
  }
  const document = await service.upload(req.file, req.documentOwner);
  return res.status(201).json(document);
}

function list(req, res) {
  return res.json({ documents: service.list(req.documentOwner) });
}

function notFound(res) {
  return res.status(404).json({
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
  });
}

async function download(req, res, next) {
  const document = await service.download(req.params.id, req.documentOwner);
  if (!document) return notFound(res);
  return res.download(document.storagePath, document.originalName, (error) => {
    if (!error) return;
    if (!res.headersSent && error.code === 'ENOENT') return notFound(res);
    return next(error);
  });
}

module.exports = { requireUser, upload, list, download };