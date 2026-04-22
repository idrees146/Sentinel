const express = require('express');

const { expiring } = require('../controllers/alertController');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

router.use(verifyToken);

router.get('/expiring', expiring);

module.exports = router;
