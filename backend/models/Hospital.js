const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    timings: { type: String, required: true },
    openTime: { type: String, required: true },   // HH:mm
    closeTime: { type: String, required: true },  // HH:mm
    open24Hours: { type: Boolean, default: false },
    emergency24x7: { type: Boolean, default: false },
    departments: [{ type: String }],
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    tokens: {
      total: { type: Number, required: true, min: 0 },
      current: { type: Number, default: 0, min: 0 },
      available: { type: Number, required: true, min: 0 },
      wait: { type: Number, default: 0, min: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hospital", hospitalSchema);
