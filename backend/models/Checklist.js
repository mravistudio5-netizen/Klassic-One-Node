const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const checklistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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

    manager_id: {
      type: String,
      default: "",
      index: true,
    },

    manager_name: {
      type: String,
      default: "",
      trim: true,
    },

    all_managers: {
      type: Boolean,
      default: false,
    },

    items: {
      type: [checklistItemSchema],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
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

module.exports = mongoose.model("Checklist", checklistSchema);