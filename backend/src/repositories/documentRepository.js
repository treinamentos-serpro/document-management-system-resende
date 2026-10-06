const fs = require('node:fs/promises');

const documents = new Map();

function save(document) {
  documents.set(document.id, { ...document });
}

function listByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .map((document) => ({ ...document }));
}

function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

async function fileExists(storagePath) {
  try {
    const stats = await fs.stat(storagePath);
    return stats.isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function removeFile(storagePath) {
  await fs.rm(storagePath, { force: true });
}

async function deleteByIdAndOwner(id, owner) {
  const document = documents.get(id);
  if (!document || document.owner !== owner) return false;

  await removeFile(document.storagePath);
  documents.delete(id);
  return true;
}

module.exports = {
  save,
  listByOwner,
  findById,
  fileExists,
  removeFile,
  deleteByIdAndOwner,
};