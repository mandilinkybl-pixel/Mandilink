const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PrivacyPolicySchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  paragraph: [{
    type: String,
    required: true,
  }],
});

module.exports = mongoose.model('PrivacyPolicy', PrivacyPolicySchema);
