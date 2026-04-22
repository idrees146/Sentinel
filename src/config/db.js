const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function connectDB(uri) {
  if (!uri) throw new Error('MONGO_URI is not set');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  mongoose.connection.on('disconnected', () => console.warn('Mongo disconnected'));
  mongoose.connection.on('error', (err) => console.error('Mongo error:', err.message));
}

module.exports = connectDB;
