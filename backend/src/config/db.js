const mongoose = require("mongoose");

async function connectDb(mongoUri) {
  try {
    await mongoose.connect(mongoUri);
    console.log("Backend connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

module.exports = connectDb;
