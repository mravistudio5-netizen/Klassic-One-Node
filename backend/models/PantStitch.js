const mongoose = require("mongoose");

const pantStitchSchema = new mongoose.Schema(
  {
    bill_number: {
      type: String,
      required: true,
      trim: true,
    },

    customer_name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile_number: {
      type: String,
      default: "",
      trim: true,
    },

    length: Number,
    waist: Number,
    seat_hip: Number,
    thigh: Number,
    knee: Number,
    bottom: Number,
    rise: Number,

    fit_type: {
      type: String,
      enum: [
        "Slim",
        "Regular",
        "Relaxed",
      ],
      default: "Regular",
    },

    notes: {
      type: String,
      default: "",
    },

    cloth_metres: Number,

    time_limit_hours: {
      type: Number,
      default: 24,
    },

    store_id: {
      type: String,
      default: "",
      index: true,
    },

    tailor_id: {
      type: String,
      default: "",
      index: true,
    },

    tailor_name: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Received",
        "Given to Tailor",
        "Completed",
        "Delivered",
        "Cancelled",
      ],
      default: "Received",
      index: true,
    },

    received_at: {
      type: Date,
      default: null,
    },

    given_to_tailor_at: {
      type: Date,
      default: null,
    },

    completed_at: {
      type: Date,
      default: null,
    },

    delivered_at: {
      type: Date,
      default: null,
    },

    on_time: {
      type: Boolean,
      default: false,
    },

    operator_id: {
      type: String,
      default: "",
    },

    operator_name: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "PantStitch",
  pantStitchSchema
);