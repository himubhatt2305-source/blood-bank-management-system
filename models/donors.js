const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  bloodGroup: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  gender: { // Added to match your signup form
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Donor', donorSchema);