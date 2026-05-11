const mongoose = require('mongoose');

const summaryOverrideSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    grossProfitLoss: { type: Number, default: null },
    netProfitLoss: { type: Number, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SummaryOverride', summaryOverrideSchema);
