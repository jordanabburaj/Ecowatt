const mongoose = require("mongoose");

const EnergySchema = new mongoose.Schema({
  energy: Number,   // kWh Today
  power: Number,    // Watts
  voltage: Number,  // Volts
  current: Number,  // Amps
  timestamp: { type: Date, default: Date.now }
});

// TTL – auto delete after 24h (saves MongoDB space)
EnergySchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("EnergyData", EnergySchema);