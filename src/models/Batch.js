const mongoose = require('mongoose');

const BATCH_STATUSES = ['Active', 'Quarantined'];

const batchSchema = new mongoose.Schema(
  {
    catalogItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CatalogItem',
      required: [true, 'catalogItemId is required'],
      index: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
      maxlength: 60,
    },
    quantityReceived: {
      type: Number,
      required: true,
      min: [1, 'quantityReceived must be at least 1'],
    },
    currentQuantity: {
      type: Number,
      required: true,
      min: [0, 'currentQuantity cannot be negative'],
      validate: {
        validator: function (v) {
          return v <= this.quantityReceived;
        },
        message: 'currentQuantity cannot exceed quantityReceived',
      },
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      validate: {
        validator: function (v) {
          if (!this.isNew) return true;
          return v instanceof Date && v.getTime() > Date.now();
        },
        message: 'expiryDate must be in the future',
      },
    },
    status: {
      type: String,
      enum: { values: BATCH_STATUSES, message: 'Status must be Active or Quarantined' },
      default: 'Active',
    },
  },
  { timestamps: true }
);

batchSchema.index({ catalogItemId: 1, batchNumber: 1 }, { unique: true });
batchSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model('Batch', batchSchema);
module.exports.BATCH_STATUSES = BATCH_STATUSES;
