const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    category: {
      type: String,
      default: "General",
    },

    store_id: {
      type: String,
      default: "",
      index: true,
    },

    store_name: {
      type: String,
      default: "",
    },

    assigned_to_id: {
      type: String,
      default: "",
      index: true,
    },

    assigned_to_name: {
      type: String,
      default: "",
    },

    location_tag: {
      type: String,
      default: "",
    },

    start_date: {
      type: Date,
      default: null,
    },

    due_date: {
      type: Date,
      default: null,
      index: true,
    },

    must_finish_before_opening: {
      type: Boolean,
      default: false,
    },

    buzzer: {
      type: Boolean,
      default: false,
    },

    validations: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    required_proof_photos: {
      type: Number,
      default: 0,
    },

    require_video_proof: {
      type: Boolean,
      default: false,
    },

    require_geo_tag_proof: {
      type: Boolean,
      default: false,
    },

    reminder_minutes: {
      type: Number,
      default: 0,
    },

    geo_fence: {
      type: Boolean,
      default: false,
    },

    highlight: {
      type: Boolean,
      default: false,
    },

    checklist: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    subtasks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    proof_photos: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    proof_note: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Done",
        "Approved",
        "Rejected",
        "Overdue",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },

    cannot_do_reason: {
      type: String,
      default: "",
    },

    reject_reason: {
      type: String,
      default: "",
    },

    recurring: {
      type: Boolean,
      default: false,
    },

    active: {
      type: Boolean,
      default: false,
      index: true,
    },

    repeat_type: {
      type: String,
      enum: [
        "None",
        "Daily",
        "Weekdays",
        "Weekly",
        "Monthly",
        "Every N Months",
      ],
      default: "None",
    },

    repeat_days: {
      type: [String],
      default: [],
    },

    repeat_interval_months: {
      type: Number,
      default: null,
    },

    template_name: {
      type: String,
      default: "",
      index: true,
    },

    shift: {
      type: String,
      enum: [
        "Morning",
        "Afternoon",
        "Opening",
        "Closing",
        "Nightly",
        "None",
      ],
      default: "None",
    },

    completed_at: {
      type: Date,
      default: null,
    },

    approved_at: {
      type: Date,
      default: null,
    },

    approved_by_id: {
      type: String,
      default: "",
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
    strict: false,
  }
);

module.exports = mongoose.model("Task", taskSchema);