const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

async function initializeAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return;
  }

  const existingAdmin = await Admin.findOne({ username });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await Admin.create({ username, password: hashedPassword });
    console.log(`Admin account initialized for ${username}`);
    return;
  }

  const isCurrentPassword = await bcrypt.compare(password, existingAdmin.password);
  if (!isCurrentPassword) {
    existingAdmin.password = await bcrypt.hash(password, 10);
    await existingAdmin.save();
    console.log(`Admin password updated for ${username}`);
  }
}

async function connectDB() {
  mongoose.set('strictQuery', false);
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/study-portal');
  console.log('MongoDB connected');
  await initializeAdmin();
}

module.exports = connectDB;
