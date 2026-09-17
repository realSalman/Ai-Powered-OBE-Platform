import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Enable default Node.js system metrics (event loop lag, memory, CPU, active handles)
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'atlasai_' });

// HTTP Request Duration Histogram
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'atlasai_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // 10ms to 10s
  registers: [register],
});

// Total HTTP Requests Counter
export const httpRequestsTotal = new client.Counter({
  name: 'atlasai_http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Express middleware to measure request duration and count
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/metrics' || req.path === '/favicon.ico') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;

    // Use route path pattern if available (e.g. /api/v1/courses/:id), fallback to baseUrl or raw path
    const route = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : (req.baseUrl || req.path || 'unknown');
    const statusCode = res.statusCode.toString();

    httpRequestDurationSeconds.observe({ method: req.method, route, status_code: statusCode }, durationSeconds);
    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
  });

  next();
};

// Handler for Prometheus scrape endpoint
export const metricsEndpoint = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end((err as Error).message);
  }
};
