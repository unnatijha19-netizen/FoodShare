
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'FoodShare backend is running!',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env');
    }

   const uri = process.env.MONGODB_URI;

console.log('MongoDB URI format:', {
  startsCorrectly: uri?.startsWith('mongodb+srv://'),
  containsPlaceholder: uri?.includes('<') || uri?.includes('>'),
  hasPortAfterHostname: /mongodb\+srv:\/\/[^/]+:\d+/.test(uri || ''),
  hostname: uri?.split('@').pop()?.split('/')[0]?.split('?')[0],
});

await mongoose.connect(uri);
    console.log('MongoDB Atlas connected successfully!');

    app.listen(PORT, () => {
      console.log(`FoodShare server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Startup error:', error.message);
    process.exitCode = 1;
  }
}

startServer();
