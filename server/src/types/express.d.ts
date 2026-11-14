declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        nombres: string;
        apellidos: string;
        correo: string;
        usuario: string;
        rolId: number;
        estado: string;
        role: string;
      };
    }
  }
}

export {};
