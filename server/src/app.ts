import express from 'express';
import cors from 'cors';
import { errorHandler } from './core/middleware/errorHandler';
import { contextMiddleware } from './core/middleware/requestContext';
import { requestLogger } from './core/middleware/requestLogger';
import { metricsMiddleware, metricsEndpoint } from './core/metrics/prometheus';
import { registerRoutes } from './modules';

const app = express();

// Trust reverse proxy (NGINX / Cloudflare / Load Balancers)
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(contextMiddleware);
app.use(metricsMiddleware);
app.use(requestLogger);

// Health check endpoint
app.get('/', (_req, res) => {
  res.send('AtlasAI API is running');
});

// Prometheus metrics scrape endpoint
app.get('/metrics', metricsEndpoint);

// Register all API modular routes
registerRoutes(app);

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;

