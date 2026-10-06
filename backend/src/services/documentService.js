const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documentRepository');

function publicDocument(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

async function upload(file, owner) {
  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
    storagePath: file.path,
  };
  try {
    await repository.save(document);
    return publicDocument(document);
  } catch (error) {
    try {
      await repository.removeFile(file.path);
    } catch (cleanupError) {
      console.error('Falha ao remover arquivo após erro no upload:', cleanupError);
    }
    throw error;
  }
}

function list(owner) {
  return repository.listByOwner(owner).map(publicDocument);
}

async function download(id, owner) {
  const document = repository.findById(id);
  if (!document || document.owner !== owner) return null;
  if (!await repository.fileExists(document.storagePath)) return null;
  return { storagePath: document.storagePath, originalName: document.originalName };
}

function remove(id, owner) {
  return repository.deleteByIdAndOwner(id, owner);
}

module.exports = { upload, list, download, remove };