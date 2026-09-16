import express from 'express';
import cors from 'cors';
import { errorHandler } from './core/middleware/errorHandler';
import { contextMiddleware } from './core/middleware/requestContext';
import { registerRoutes } from './modules';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(contextMiddleware);

// Health check endpoint
app.get('/', (_req, res) => {
  res.send('AtlasAI API is running');
});

// Register all API modular routes
registerRoutes(app);

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;
