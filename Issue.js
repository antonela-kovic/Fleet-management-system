//---Issue.js---
const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  description: { type: String, required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'pading', enum: ['pading', 'resolved', 'rejected'] }, // Dodan status kako bi se moglo pratit stanje problema
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' }, // Dodana referenca na rezervaciju za uvid
});

module.exports = mongoose.model('Issue', IssueSchema);
