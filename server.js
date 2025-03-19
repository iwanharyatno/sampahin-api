require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authMiddleware = require('./middlewares/authMiddleware');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error(err));

app.get("/ping", (req, res) => {
    return res.json({
        message: 'pong'
    });
});
app.use('/api/auth', authRoutes);
app.use(authMiddleware);

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));