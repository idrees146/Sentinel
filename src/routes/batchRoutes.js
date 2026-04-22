const express = require('express');

const { receive, consume } = require('../controllers/batchController');
const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const { receiveSchema, consumeSchema, idParamSchema } = require('../validators/batchValidators');

const router = express.Router();

router.use(verifyToken);

router.post(
  '/receive',
  requireRole(['Admin', 'Pharmacist']),
  validate({ body: receiveSchema }),
  receive
);

router.patch(
  '/:id/consume',
  requireRole(['Admin', 'Pharmacist', 'Nurse']),
  validate({ params: idParamSchema, body: consumeSchema }),
  consume
);

module.exports = router;
