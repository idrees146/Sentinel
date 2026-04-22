const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const idParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid id'),
});

const receiveSchema = z
  .object({
    catalogItemId: z.string().regex(objectIdRegex, 'Invalid catalogItemId'),
    batchNumber: z.string().trim().min(1).max(60),
    quantityReceived: z.number().int().min(1),
    expiryDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
      message: 'expiryDate must be in the future',
    }),
    status: z.enum(['Active', 'Quarantined']).optional(),
  })
  .strict();

const consumeSchema = z
  .object({
    amount: z.number().int().min(1, 'amount must be at least 1'),
  })
  .strict();

module.exports = { idParamSchema, receiveSchema, consumeSchema };
