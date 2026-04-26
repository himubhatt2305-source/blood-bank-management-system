const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  name: String,
  bloodGroup: String,
  city: String,
  status: {
    type: String,
    default: "Pending"
  }
});

module.exports = mongoose.model('Request', requestSchema);