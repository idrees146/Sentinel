const { z } = require('zod');

const createItemSchema = z
  .object({
    itemName: z.string().trim().min(2).max(120),
    category: z.string().trim().min(2).max(60),
    minimumThreshold: z.number().int().min(0).default(0),
  })
  .strict();

const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

module.exports = { createItemSchema, listQuerySchema };
