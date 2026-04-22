const Batch = require('../models/Batch');
const CatalogItem = require('../models/CatalogItem');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.receive = asyncHandler(async (req, res) => {
  const { catalogItemId, batchNumber, quantityReceived, expiryDate, status } = req.body;

  const catalog = await CatalogItem.findById(catalogItemId);
  if (!catalog) {
    throw new ApiError(404, 'CATALOG_NOT_FOUND', 'Catalog item does not exist');
  }

  const batch = await Batch.create({
    catalogItemId,
    batchNumber,
    quantityReceived,
    currentQuantity: quantityReceived,
    expiryDate,
    status: status || 'Active',
  });

  res.status(201).json({ success: true, data: batch });
});

exports.consume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  const updated = await Batch.findOneAndUpdate(
    { _id: id, status: 'Active', currentQuantity: { $gte: amount } },
    { $inc: { currentQuantity: -amount } },
    { new: true }
  );

  if (!updated) {
    const existing = await Batch.findById(id);
    if (!existing) {
      throw new ApiError(404, 'BATCH_NOT_FOUND', 'Batch does not exist');
    }
    if (existing.status !== 'Active') {
      throw new ApiError(409, 'BATCH_NOT_ACTIVE', `Cannot consume from a ${existing.status} batch`);
    }
    throw new ApiError(
      409,
      'INSUFFICIENT_STOCK',
      `Requested ${amount} but only ${existing.currentQuantity} available`
    );
  }

  res.status(200).json({ success: true, data: updated });
});
