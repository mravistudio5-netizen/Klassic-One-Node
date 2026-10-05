const mongoose = require("mongoose");

const sheetSchema = new mongoose.Schema(
  {
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

    sensitivity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },

    notes: {
      type: String,
      default: "",
    },

    archived: {
      type: Boolean,
      default: false,
      index: true,
    },

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

module.exports = mongoose.model("Sheet", sheetSchema);