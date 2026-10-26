require('dotenv').config();

const mongoose = require('mongoose');
const { server } = require('./app');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing from .env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Atlas connected successfully!');

    server.listen(PORT, () => {
      console.log(`FoodShare server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
