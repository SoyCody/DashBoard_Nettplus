const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (isFormData) {
    headers.delete('Content-Type');
  } else if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Inténtalo nuevamente.', 0);
  }

  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Ocurrió un error al procesar la solicitud.', response.status);
  }

  return payload as T;
}

export type RequestProgress = {
  phase: 'validating' | 'saving';
  completed: number;
  total: number;
};

export async function apiEventStreamRequest<T>(
  path: string,
  init: RequestInit,
  onProgress: (progress: RequestProgress) => void,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'text/event-stream');
  if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
    headers.delete('Content-Type');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Inténtalo nuevamente.', 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(payload.message ?? 'Ocurrió un error al procesar la solicitud.', response.status);
  }
  if (!response.body) {
    throw new ApiError('El servidor no pudo transmitir el avance de la importación.', response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let result: T | undefined;

  const handleFrame = (frame: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data.push(line.slice(5).trim());
      }
    }
    if (data.length === 0) {
      return;
    }
    const payload = JSON.parse(data.join('\n')) as RequestProgress & { message?: string };
    if (event === 'progress') {
      onProgress(payload);
    } else if (event === 'result') {
      result = payload as T;
    } else if (event === 'error') {
      throw new ApiError(payload.message ?? 'No se pudo completar la importación.', response.status);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let frameEnd = pending.indexOf('\n\n');
      while (frameEnd >= 0) {
        handleFrame(pending.slice(0, frameEnd));
        pending = pending.slice(frameEnd + 2);
        frameEnd = pending.indexOf('\n\n');
      }
      if (done) {
        if (pending.trim()) {
          handleFrame(pending);
        }
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (result === undefined) {
    throw new ApiError('La conexión terminó antes de confirmar la importación.', response.status);
  }
  return result;
}

export async function downloadApiFile(path: string, filename: string) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Inténtalo nuevamente.', 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(payload.message ?? 'No se pudo descargar el archivo.', response.status);
  }

  const objectUrl = window.URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
}
