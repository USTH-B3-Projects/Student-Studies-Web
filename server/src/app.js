const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const taskRoutes = require('./routes/taskRoutes');
const smartRoutes = require('./routes/smartRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://127.0.0.1:5501',
    'https://usth-b3-projects.github.io',
    'http://localhost:5500',
    'http://localhost:5501'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/smart', smartRoutes);

module.exports = app;
