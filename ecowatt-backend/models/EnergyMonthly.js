const mongoose = require("mongoose");

const EnergyMonthlySchema = new mongoose.Schema({
  month: {
    type: String, // YYYY-MM
    required: true,
    unique: true
  },
  totalEnergy: {
    type: Number, // kWh
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Keep only 2 months automatically
EnergyMonthlySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 62 } // ~62 days
);

module.exports = mongoose.model("EnergyMonthly", EnergyMonthlySchema);