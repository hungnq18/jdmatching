const dotenv = require('dotenv');
const connectDB = require('./config/database');
const app = require('./app'); // Sử dụng app đã cấu hình routes

dotenv.config();
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
