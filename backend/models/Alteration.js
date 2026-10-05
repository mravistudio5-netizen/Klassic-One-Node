const mongoose = require("mongoose");

const alterationSchema = new mongoose.Schema(
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

    product: {
      type: String,
      default: "Pant",
      trim: true,
    },

    quantity: {
      type: Number,
      default: 1,
    },

    alteration_note: {
      type: String,
      default: "",
    },

    time_limit_hours: {
      type: Number,
      default: 2,
    },

    store_id: {
      type: String,
      default: "",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "Received",
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
completed_by_id: {
  type: String,
  default: "",
},

completed_by_name: {
  type: String,
  default: "",
},

delivered_by_id: {
  type: String,
  default: "",
},

delivered_by_name: {
  type: String,
  default: "",
},
history: {
  type: [
    {
      action: {
        type: String,
        default: "",
      },
      by_id: {
        type: String,
        default: "",
      },
      by_name: {
        type: String,
        default: "",
      },
      at: {
        type: Date,
        default: null,
      },
    },
  ],
  default: [],
},
    // ================================
    // EXTERNAL TAILOR ASSIGNMENT
    // ================================

    external_tailor_id: {
      type: String,
      default: "",
      index: true,
    },

    external_tailor_name: {
      type: String,
      default: "",
    },

    external_tailor_mobile: {
      type: String,
      default: "",
    },

    external_tailor_assigned_at: {
      type: Date,
      default: null,
    },

    external_tailor_status: {
      type: String,
      enum: [
        "",
        "Assigned",
        "Completed",
        "Returned",
      ],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Alteration",
  alterationSchema
);