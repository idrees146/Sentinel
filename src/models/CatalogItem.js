const mongoose = require('mongoose');

const catalogItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: 60,
    },
    minimumThreshold: {
      type: Number,
      required: true,
      min: [0, 'Minimum threshold cannot be negative'],
      default: 0,
    },
  },
  { timestamps: true }
);

catalogItemSchema.index(
  { itemName: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('CatalogItem', catalogItemSchema);
