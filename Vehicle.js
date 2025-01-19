// --- Models: Vehicle.js ---

const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  registrationExpiryDate: { type: Date, required: true }, 
});

module.exports = mongoose.model('Vehicle', VehicleSchema);



