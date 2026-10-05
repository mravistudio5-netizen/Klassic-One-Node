const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      default: "",
      trim: true,
    },

    store_id: {
      type: String,
      default: "",
      index: true,
    },

    store_name: {
      type: String,
      default: "",
      trim: true,
    },

    head_name: {
      type: String,
      default: "",
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Department",
  departmentSchema
);