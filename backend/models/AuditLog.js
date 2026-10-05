const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      default: "",
    },

    action: {
      type: String,
      required: true,
    },

    entity_id: {
      type: String,
      default: "",
    },

    entity_name: {
      type: String,
      default: "",
    },

    actor_id: {
      type: String,
      default: "",
    },

    actor_name: {
      type: String,
      default: "",
    },

    store_id: {
      type: String,
      default: "",
    },

    details: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "AuditLog",
  auditLogSchema
);