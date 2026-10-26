const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true }, // vehicle model, e.g. "Skoda Octavia"
  name: { type: String, required: true, trim: true, uppercase: true }, // licence plate
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  registrationExpiryDate: { type: Date, required: true },
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
