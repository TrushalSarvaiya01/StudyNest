require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudyNest API is running' });
});

app.use('/api', publicRoutes);
app.use('/api', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler - ensures every error (including malformed JSON
// bodies, oversized uploads, or anything thrown outside a route's own
// try/catch) still returns a clean JSON response instead of Express's
// default HTML error page, which the frontend cannot parse.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error('Unhandled error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }

  res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
