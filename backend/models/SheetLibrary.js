const mongoose = require("mongoose");

const sheetLibrarySchema = new mongoose.Schema(
  {
    // -----------------------------------------
    // BASIC SHEET INFO
    // -----------------------------------------

    name: {
      type: String,
      required: true,
      trim: true,
    },

    link: {
      type: String,
      required: true,
      trim: true,
    },

    purpose: {
      type: String,
      default: "",
      trim: true,
    },

    // -----------------------------------------
    // STORE
    // -----------------------------------------

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

    all_stores: {
      type: Boolean,
      default: true,
    },

    // -----------------------------------------
    // DEPARTMENT
    // -----------------------------------------

    department_id: {
      type: String,
      default: "",
      index: true,
    },

    department_name: {
      type: String,
      default: "",
      trim: true,
    },

    // -----------------------------------------
    // CATEGORY
    // -----------------------------------------

    category: {
      type: String,
      enum: [
        "Stock",
        "Purchase",
        "Staff",
        "Accounts",
        "Reports",
        "Other",
      ],
      default: "Other",
    },

    // -----------------------------------------
    // SENSITIVITY
    // -----------------------------------------

    sensitivity: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
      ],
      default: "Low",
    },

    // -----------------------------------------
    // NOTES
    // -----------------------------------------

    notes: {
      type: String,
      default: "",
    },

    // -----------------------------------------
    // STATUS
    // -----------------------------------------

    archived: {
      type: Boolean,
      default: false,
      index: true,
    },

    // -----------------------------------------
    // CREATED BY
    // -----------------------------------------

    created_by_id: {
      type: String,
      default: "",
    },

    created_by_name: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SheetLibrary",
  sheetLibrarySchema
);