//---Reservation.js---

const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  vehicleType: String,
  startDate: Date,
  endDate: Date,
  purpose:String,
  status: { type: String, default: 'pending' },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  assignedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null,
  },
  employeeId: { // Vraćanje employeeId polja
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, 
  },
});

module.exports = mongoose.model('Reservation', ReservationSchema);

