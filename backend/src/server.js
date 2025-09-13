const dotenv = require('dotenv');
const connectDB = require('./config/database');
const app = require('./app');

// Load environment variables
dotenv.config();

// Connect to MongoDB Atlas
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});
