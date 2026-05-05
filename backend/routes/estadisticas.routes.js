const router = require('express').Router();
const ctrl   = require('../controllers/estadisticas.controller');

router.get('/',                          ctrl.getAll);
router.get('/jugador/:jugador_id',        ctrl.getByJugador);
router.post('/',                         ctrl.create);
router.put('/:id',                       ctrl.update);
router.delete('/:id',                    ctrl.remove);

module.exports = router;
