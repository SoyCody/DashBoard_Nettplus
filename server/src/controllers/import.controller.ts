import ExcelJS from 'exceljs';
import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  ImportServiceError,
  type ImportProgress,
  listImports,
  previewImport,
  processImport,
} from '../services/import.service.js';
import { importPeriodSchema } from '../validators/import.schema.js';
import { paginationSchema } from '../validators/pagination.schema.js';

function actorId(req: Request) {
  const id = (req as AuthenticatedRequest).user?.id;
  if (!id) {
    throw new ImportServiceError('No autenticado', 401);
  }
  return id;
}

function parsePeriod(req: Request, res: Response) {
  const parsed = importPeriodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'El período de importación no es válido.',
    });
    return null;
  }
  return parsed.data;
}

function respondError(error: unknown, next: NextFunction, res: Response) {
  if (error instanceof ImportServiceError) {
    return res.status(error.status).json({ message: error.message });
  }
  return next(error);
}

export async function validateImportController(req: Request, res: Response, next: NextFunction) {
  const period = parsePeriod(req, res);
  if (!period) {
    return;
  }
  if (!req.file) {
    return res.status(400).json({ message: 'Selecciona un archivo XLS o XLSX para validar.' });
  }

  try {
    const preview = await previewImport(req.file.buffer, req.file.originalname, period);
    return res.status(200).json({ preview });
  } catch (error) {
    return respondError(error, next, res);
  }
}

export async function createImportController(req: Request, res: Response, next: NextFunction) {
  const period = parsePeriod(req, res);
  if (!period) {
    return;
  }
  if (!req.file) {
    return res.status(400).json({ message: 'Selecciona un archivo XLS o XLSX para importar.' });
  }

  let responseStarted = false;
  const sendEvent = async (event: string, value: unknown) => {
    if (res.destroyed) {
      return;
    }
    if (!responseStarted) {
      res.status(201);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      responseStarted = true;
    }
    res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  try {
    await sendEvent('progress', { phase: 'validating', completed: 0, total: 1 });
    const reportProgress = (progress: ImportProgress) => sendEvent('progress', progress);
    const result = await processImport(req.file.buffer, req.file.originalname, period, actorId(req), reportProgress);
    await sendEvent('result', result);
    return res.end();
  } catch (error) {
    if (responseStarted) {
      if (error instanceof ImportServiceError) {
        await sendEvent('error', { message: error.message, status: error.status });
        return res.end();
      }
      await sendEvent('error', { message: 'Error interno del servidor', status: 500 });
    }
    return respondError(error, next, res);
  }
}

export async function listImportsController(req: Request, res: Response, next: NextFunction) {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Paginación inválida' });
  }
  try {
    return res.status(200).json(await listImports(parsed.data));
  } catch (error) {
    return next(error);
  }
}

export async function importTemplateController(_req: Request, res: Response, next: NextFunction) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Marcaciones');
    sheet.columns = [
      { header: 'codigo', key: 'codigo', width: 20 },
      { header: 'fecha', key: 'fecha', width: 16 },
      { header: 'hora', key: 'hora', width: 14 },
      { header: 'tipo', key: 'tipo', width: 16 },
    ];
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    sheet.addRows([
      { codigo: 'NET-1001', fecha: today, hora: '08:02', tipo: 'entrada' },
      { codigo: 'NET-1001', fecha: today, hora: '17:00', tipo: 'salida' },
    ]);
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = 'A1:D1';
    sheet.getColumn('codigo').numFmt = '@';

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_marcaciones_nettplus.xlsx"');
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    return next(error);
  }
}
