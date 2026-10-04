const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true
    },
    hospitalName: { type: String, required: true },
    department: { type: String, required: true },
    patientName: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 1, max: 120 },
    phone: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/
    },
    issue: { type: String, required: true, trim: true, maxlength: 1000 },
    date: { type: String, required: true },
    token: { type: Number, required: true },
    wait: { type: Number, default: 0 },
    distance: { type: Number, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
