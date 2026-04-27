const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 1 },
    buyPrice: { type: Number, required: true, min: 0 },
    sellPrice: { type: Number, required: true, min: 0 },
    tradeType: {
      type: String,
      enum: ['delivery', 'intraday', 'options'],
      default: 'delivery'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('Stock', stockSchema);
