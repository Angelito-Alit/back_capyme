const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagos.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/crear-preferencia', verifyToken, pagosController.crearPreferencia);
router.post('/webhook', pagosController.webhook);

module.exports = router;