const mongoose = require("mongoose");

const sheetAccessSchema = new mongoose.Schema(
  {
    sheet_id: {
      type: String,
      required: true,
      index: true,
    },

    sheet_name: {
      type: String,
      default: "",
    },

    user_id: {
      type: String,
      required: true,
      index: true,
    },

    user_name: {
      type: String,
      default: "",
    },

    user_email: {
      type: String,
      default: "",
    },

    manager_id: {
      type: String,
      default: "",
    },

    manager_name: {
      type: String,
      default: "",
    },

    access_level: {
      type: String,
      enum: ["View", "Comment", "Edit"],
      default: "View",
    },

    store_id: {
      type: String,
      default: "",
    },

    expiry_date: {
      type: Date,
      default: null,
    },

    reason: {
      type: String,
      default: "",
    },

    favourite: {
      type: Boolean,
      default: false,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SheetAccess",
  sheetAccessSchema
);