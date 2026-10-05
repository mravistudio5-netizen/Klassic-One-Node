const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: [
        "owner",
        "admin",
        "mis",
        "manager",
        "tailoring_manager",
        "tailoring_operator",
      ],
      default: "manager",
    },

    manager_id: {
      type: String,
      default: "",
    },

    mobile: {
      type: String,
      default: "",
    },

    google_email: {
      type: String,
      default: "",
    },

    store_id: {
      type: String,
      default: "",
    },

    department_id: {
      type: String,
      default: "",
    },

    department: {
      type: String,
      default: "",
    },

    shift: {
      type: String,
      enum: ["Morning", "Afternoon", "General"],
      default: "General",
    },

    active: {
      type: Boolean,
      default: true,
    },

    language: {
      type: String,
      enum: ["en", "hi", "mr"],
      default: "en",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);