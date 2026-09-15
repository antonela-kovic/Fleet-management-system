const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  ime: { type: String, required: true },
  datum: { type: Date, required: true },
  opis: { type: String, required: true }
});

module.exports = mongoose.model('Note', noteSchema);
