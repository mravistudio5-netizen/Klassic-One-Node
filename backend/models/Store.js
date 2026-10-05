const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    opening_time: {
      type: String,
      default: "10:00",
    },

    locations: {
      type: [String],
      default: [
        "Basement",
        "Ground Floor",
        "Floor 1",
        "Floor 2",
        "Floor 3",
        "4th Floor Warehouse",
        "Washroom",
        "Terrace",
      ],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Store", storeSchema);