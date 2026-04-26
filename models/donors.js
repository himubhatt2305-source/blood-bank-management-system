const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  name: String,
  bloodGroup: String,
  phone: String,
  city: String
});

module.exports = mongoose.model('Donor', donorSchema);