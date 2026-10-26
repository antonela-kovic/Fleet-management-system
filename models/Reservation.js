const mongoose = require('mongoose');

const RESERVATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'vehicle assigned',
  'cancelled by user',
  'expired',
];

const reservationSchema = new mongoose.Schema({
  vehicleType: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  purpose: { type: String, required: true, trim: true },
  status: { type: String, enum: RESERVATION_STATUSES, default: 'pending' },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.model('Reservation', reservationSchema);
module.exports.RESERVATION_STATUSES = RESERVATION_STATUSES;
