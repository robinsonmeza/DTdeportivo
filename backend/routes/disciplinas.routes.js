const router = require('express').Router();
const ctrl   = require('../controllers/disciplinas.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

router.get('/',       ctrl.getAll);
router.post('/',      autorizar('administrador', 'entrenador'), ctrl.create);
router.delete('/:id', autorizar('administrador'),               ctrl.remove);

module.exports = router;
