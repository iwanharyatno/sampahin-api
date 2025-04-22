require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authMiddleware = require('./middlewares/authMiddleware');
const authRoutes = require('./routes/authRoutes');
const tpsRoutes = require('./routes/tpsRoutes');
const pickupRoutes = require('./routes/pickupRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

console.log('Connecting to MongoDB', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error(err));

app.get("/ping", (req, res) => {
    return res.json({
        message: 'pong'
    });
});
app.use('/api/auth', authRoutes);
app.use('/api/tps', tpsRoutes);
app.use('/api/pickup-request', pickupRoutes);

// Default (not found) route
app.use(function(req, res, next) {
    return res.status(404).json({
        'message': 'Route not found'
    })
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

module.exports = app;