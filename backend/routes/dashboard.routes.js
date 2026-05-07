const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const { verificarToken } = require('../middleware/auth');

router.get('/', verificarToken, ctrl.getSummary);

module.exports = router;
