import multer from 'multer';
import type { RequestHandler } from 'express';
import { Router } from 'express';
import {
  createImportController,
  importTemplateController,
  listImportsController,
  validateImportController,
} from '../controllers/import.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { requirePermission, requireRole } from '../middlewares/role.middleware.js';

const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 2,
    parts: 3,
  },
}).single('archivo');

const receiveImportFile: RequestHandler = (req, res, next) => {
  uploadFile(req, res, (error: unknown) => {
    if (!error) {
      return next();
    }
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el límite de 10 MB.'
        : 'No se pudo recibir el archivo de importación.';
      return res.status(status).json({ message });
    }
    return next(error);
  });
};

export const importRouter = Router();

importRouter.use(['/imports', '/imports/*'], authRequired, requireRole('asistente_rrhh', 'administrador'));
importRouter.get('/imports', requirePermission('importar', 'ver'), listImportsController);
importRouter.get('/imports/template', requirePermission('importar', 'ver'), importTemplateController);
importRouter.post('/imports/validate', requirePermission('importar', 'crear'), receiveImportFile, validateImportController);
importRouter.post('/imports', requirePermission('importar', 'crear'), receiveImportFile, createImportController);
