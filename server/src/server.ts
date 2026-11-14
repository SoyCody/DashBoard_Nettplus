import { app } from './app.js';
import env from './config/env.js';

app.listen(env.port, () => {
  console.log(`Servidor NETTPLUS escuchando en http://localhost:${env.port}`);
});
