const router = require('express').Router();
const ctrl   = require('../controllers/equipos.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

router.use(verificarToken);

// Solo entrenadores, personal de salud y administrador pueden ver los equipos
router.get('/',           autorizar('administrador', 'entrenador', 'personal_salud'), ctrl.getAll);
router.get('/:id',        autorizar('administrador', 'entrenador', 'personal_salud'), ctrl.getOne);

// Entrenadores y administrador pueden crear, editar y gestionar imágenes
router.post('/',          autorizar('administrador', 'entrenador'), ctrl.create);
router.put('/:id',        autorizar('administrador', 'entrenador'), ctrl.update);
router.post('/:id/logo',  autorizar('administrador', 'entrenador'), ctrl.uploadMiddleware, ctrl.uploadLogo);
router.delete('/:id',     autorizar('administrador', 'entrenador'), ctrl.remove);

module.exports = router;

