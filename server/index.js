import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import dashboardRouter from './routes/dashboard.js';
import mealsRouter from './routes/meals.js';
import pantryRouter from './routes/pantry.js';
import shoppingRouter from './routes/shopping.js';
import financeRouter from './routes/finance.js';
import domoticsRouter from './routes/domotics.js';
import documentsRouter from './routes/documents.js';
import databaseRouter from './routes/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Sample static documents directory for demo previews
const sampleDocsDir = path.join(__dirname, '../sample-docs');
if (!fs.existsSync(sampleDocsDir)) {
  fs.mkdirSync(sampleDocsDir, { recursive: true });
}
app.use('/sample-docs', express.static(sampleDocsDir));

// API Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Domotica & Hogar Integral API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/pantry', pantryRouter);
app.use('/api/shopping', shoppingRouter);
app.use('/api/finance', financeRouter);
app.use('/api/domotics', domoticsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/database', databaseRouter);

// Serve Frontend in Production
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/sample-docs') || req.path === '/health') {
      return res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  🏠 Domótica y Gestión Integral del Hogar API`);
  console.log(`  🚀 Servidor activo en http://localhost:${PORT}`);
  console.log(`  📦 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});
