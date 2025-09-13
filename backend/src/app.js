const cors = require("cors");
const express = require("express");
const path = require("path");
const matchRoutes = require('./routes/match');
const jdRoutes = require('./routes/jd');
const jdRoutesNew = require('./routes/jdRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tạo thư mục uploads nếu chưa có
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads/jd');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', matchRoutes);
app.use('/api/jd', jdRoutesNew);

module.exports = app;
