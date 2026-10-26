const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  description: { type: String, required: true, trim: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' },
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
});

module.exports = mongoose.model('Issue', issueSchema);
