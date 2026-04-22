const Batch = require('../models/Batch');
const asyncHandler = require('../utils/asyncHandler');

const DAY_MS = 24 * 60 * 60 * 1000;

exports.expiring = asyncHandler(async (_req, res) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 30 * DAY_MS);

  const batches = await Batch.find({
    status: 'Active',
    expiryDate: { $gte: now, $lte: windowEnd },
  })
    .sort({ expiryDate: 1 })
    .populate('catalogItemId', 'itemName category minimumThreshold');

  res.status(200).json({
    success: true,
    data: batches,
    meta: {
      windowDays: 30,
      evaluatedAt: now.toISOString(),
      count: batches.length,
    },
  });
});
