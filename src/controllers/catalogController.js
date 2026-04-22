const CatalogItem = require('../models/CatalogItem');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.createItem = asyncHandler(async (req, res) => {
  const item = await CatalogItem.create(req.body);
  res.status(201).json({ success: true, data: item });
});

exports.listItems = asyncHandler(async (req, res) => {
  const { page, limit, category, search } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (search) filter.itemName = { $regex: escapeRegex(search), $options: 'i' };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    CatalogItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CatalogItem.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});
