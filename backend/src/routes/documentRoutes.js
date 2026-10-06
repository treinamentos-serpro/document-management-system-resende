const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { mkdir } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const controller = require('../controllers/documentController');

function createDocumentRouter() {
  const storageDirectory = process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR)
    : path.resolve(__dirname, '../../storage');
  const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES ?? 10485760);
  if (!Number.isSafeInteger(maxFileSize) || maxFileSize < 1) {
    throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
  }
  const upload = multer({
    storage: multer.diskStorage({
      destination(req, file, callback) {
        mkdir(storageDirectory, { recursive: true }).then(
          () => callback(null, storageDirectory),
          (error) => callback(error),
        );
      },
      filename(req, file, callback) {
        callback(null, randomUUID());
      },
    }),
    limits: { fileSize: maxFileSize, files: 1 },
  });
  const router = express.Router();
  router.post('/upload', controller.requireUser, upload.single('file'), controller.upload);
  router.get('/documents', controller.requireUser, controller.list);
  router.get('/documents/:id/download', controller.requireUser, controller.download);
  return router;
}

module.exports = createDocumentRouter;