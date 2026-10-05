const mongoose = require("mongoose");

const checklistEntryItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },

    done: {
      type: Boolean,
      default: false,
    },

    done_at: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const checklistEntrySchema = new mongoose.Schema(
  {
    checklist_id: {
      type: String,
      required: true,
      index: true,
    },

    checklist_name: {
      type: String,
      default: "",
      trim: true,
    },

    date: {
      type: String,
      required: true,
      index: true,
    },

    month: {
      type: String,
      default: "",
      index: true,
    },

    manager_id: {
      type: String,
      required: true,
      index: true,
    },

    manager_name: {
      type: String,
      default: "",
      trim: true,
    },

    store_id: {
      type: String,
      default: "",
      index: true,
    },

    items: {
      type: [checklistEntryItemSchema],
      default: [],
    },

    completed_pct: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

checklistEntrySchema.index(
  {
    checklist_id: 1,
    date: 1,
    manager_id: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "ChecklistEntry",
  checklistEntrySchema
);