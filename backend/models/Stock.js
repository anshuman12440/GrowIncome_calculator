const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    entryType: {
      type: String,
      enum: ['stock', 'manual'],
      default: 'stock'
    },
    name: { type: String, required: true, trim: true, uppercase: true },
    quantity: {
      type: Number,
      required() {
        return this.entryType !== 'manual';
      },
      min: 1
    },
    buyPrice: {
      type: Number,
      required() {
        return this.entryType !== 'manual';
      },
      min: 0
    },
    sellPrice: {
      type: Number,
      required() {
        return this.entryType !== 'manual';
      },
      min: 0
    },
    tradeType: {
      type: String,
      enum: ['delivery', 'intraday', 'options'],
      default: 'delivery'
    },
    manualAmount: { type: Number, default: 0 },
    manualGrossPL: { type: Number, default: 0 },
    manualNetPL: { type: Number, default: 0 }
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
