const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    inputText: {
      type: String,
      required: true
    },
    operationType: {
      type: String,
      enum: ["uppercase", "lowercase", "reverse", "word_count"],
      required: true
    },
    status: {
      type: String,
      enum: ["created", "pending", "running", "success", "failed"],
      default: "created"
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    },
    attempts: {
      type: Number,
      default: 0
    },
    logs: [
      {
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
