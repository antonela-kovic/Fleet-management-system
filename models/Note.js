const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  author: { type: String, required: true, trim: true }, // name of the admin who wrote the note
  date: { type: Date, required: true },
  text: { type: String, required: true, trim: true },
});

module.exports = mongoose.model('Note', noteSchema);
