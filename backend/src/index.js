import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import lotteryRoutes from './routes/lotteries.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import resultRoutes from './routes/results.js';
import prizeRoutes from './routes/prizes.js';
import cron from 'node-cron';
import { syncResults } from './lib/sync-results.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const jsonParser = express.json();
app.use((req, res, next) => {
  jsonParser(req, res, (err) => {
    if (err) {
      // Cuerpo vacío o JSON inválido: seguir con body vacío en vez de tumbar la petición
      req.body = {};
      return next();
    }
    next();
  });
});

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/lotteries', lotteryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/prizes', prizeRoutes);

app.use('/api', (req, res) => {
  console.log(`404 sin ruta: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`lottery-backend listening on http://localhost:${PORT}`);
});

if (process.env.RESULTS_SYNC_ENABLED === 'true' && process.env.LOTERIAS_API_KEY) {
  const schedule = process.env.RESULTS_SYNC_CRON || '20 15,21,23 * * *';
  cron.schedule(
    schedule,
    async () => {
      try {
        const summary = await syncResults();
        console.log('Auto-sync resultados:', JSON.stringify({ created: summary.created, winners: summary.winnersMarked }));
      } catch (err) {
        console.error('Auto-sync falló:', err instanceof Error ? err.message : err);
      }
    },
    { timezone: 'America/Santo_Domingo' }
  );
  console.log(`Auto-sync de resultados activo (${schedule} America/Santo_Domingo)`);
}
