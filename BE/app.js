const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const taskRoutes = require('./routes/taskRoutes');
const smartRoutes = require('./routes/smartRoutes');
const { authenticate } = require('./middleware/authenticate');

const app = express();
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'https://usth-b3-projects.github.io',
  'http://localhost:5500',
  'http://localhost:5501'
];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ error: 'Request body must be an object' });
  }
  next();
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/smart', authenticate, smartRoutes);

// Keep API errors JSON, including malformed request bodies.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : error.message });
});

module.exports = app;
