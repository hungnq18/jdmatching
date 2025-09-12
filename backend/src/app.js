const cors = require("cors");
const express = require("express");
const matchRoutes = require('./routes/match');
const jdRoutes = require('./routes/jd');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', matchRoutes);
app.use('/api', jdRoutes);

module.exports = app;
