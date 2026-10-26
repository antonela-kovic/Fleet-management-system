const Reservation = require('../models/Reservation');
const Vehicle = require('../models/Vehicle');

// Marks reservations whose end date has passed as "expired" and makes their
// vehicles available again.
const expireFinishedReservations = async () => {
  const expired = await Reservation.find({
    endDate: { $lt: new Date() },
    status: 'vehicle assigned',
  });

  for (const reservation of expired) {
    if (reservation.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(reservation.assignedVehicle, { status: 'available' });
    }
    reservation.status = 'expired';
    reservation.assignedVehicle = null;
    await reservation.save();
  }

  return expired.length;
};

module.exports = { expireFinishedReservations };
