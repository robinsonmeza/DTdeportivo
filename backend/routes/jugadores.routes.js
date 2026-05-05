const router = require('express').Router();
const ctrl   = require('../controllers/jugadores.controller');

router.get('/',     ctrl.getAll);
router.get('/:id',  ctrl.getOne);
router.post('/',    ctrl.create);
router.post('/:id/foto', ctrl.uploadMiddleware, ctrl.uploadPhoto);
router.put('/:id',  ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
