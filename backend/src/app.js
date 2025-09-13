const cors = require("cors");
const express = require("express");
const path = require("path");
const matchRoutes = require('./routes/match');
const jdRoutesNew = require('./routes/jdRoutes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://jdmatching-1.onrender.com',
      'https://jdmatching-csoft.vercel.app',
      'https://c-soft-frontend.onrender.com',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    // Allow Vercel preview deployments
    if (origin && origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Tạo thư mục uploads nếu chưa có
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads/jd');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'C-Soft Backend API is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      api: '/api',
      jd: '/api/jd'
    }
  });
});

// Test endpoint for frontend
app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'API connection successful!',
    timestamp: new Date().toISOString(),
    origin: req.get('Origin') || 'No origin header'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected' // This will be updated based on actual connection status
  });
});

// API routes
app.use('/api', matchRoutes);
app.use('/api/jd', jdRoutesNew);

module.exports = app;
