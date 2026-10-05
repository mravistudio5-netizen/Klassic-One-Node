const mongoose = require("mongoose");

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
    enum: ["owner", "admin", "mis", "manager", "tailoring_manager", "tailoring_operator"],
  },
  matrix: { type: mongoose.Schema.Types.Mixed, default: {} },
  modules: { type: [String], default: [] },
  can_assign_cross_department: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("RolePermission", rolePermissionSchema);
