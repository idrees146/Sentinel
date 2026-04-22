const express = require('express');

const { createItem, listItems } = require('../controllers/catalogController');
const verifyToken = require('../middlewares/verifyToken');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const { createItemSchema, listQuerySchema } = require('../validators/catalogValidators');

const router = express.Router();

router.use(verifyToken);

router.post('/', requireRole(['Admin', 'Pharmacist']), validate({ body: createItemSchema }), createItem);
router.get('/', validate({ query: listQuerySchema }), listItems);

module.exports = router;
