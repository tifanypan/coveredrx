console.log('🔥 index.ts loaded');


import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import coverageRoutes from './routes/coverage';
import { coverageService } from './services/coverageService';



const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false // Allow for AI API requests
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  })
);
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


// Health check with all AI services
app.get('/api/health', async (req, res) => {
  // Test all AI services including the new web research
  const healthStatus = await coverageService.healthCheck();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      groq: process.env.GROQ_API_KEY 
        ? (healthStatus.groq ? 'healthy' : 'configured but not responding') 
        : 'missing',
      toolhouse: process.env.TOOLHOUSE_API_KEY
        ? (healthStatus.toolhouse ? 'healthy' : 'configured but not responding')
        : 'missing',
      webResearch: process.env.GROQ_API_KEY 
        ? (healthStatus.webResearch ? 'healthy' : 'configured but not responding') 
        : 'missing'
    }
  });
});

// Coverage routes
app.use('/api/coverage', coverageRoutes);

// Global error handler
app.use(
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
      timestamp: new Date().toISOString()
    });
  }
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found' },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CoveredRx Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Coverage API: http://localhost:${PORT}/api/coverage/check`);
});