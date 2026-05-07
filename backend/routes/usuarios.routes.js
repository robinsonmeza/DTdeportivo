const router  = require('express').Router();
const multer  = require('multer');
const ctrl    = require('../controllers/usuarios.controller');
const { verificarToken, autorizar } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.use(verificarToken);

router.get('/',            autorizar('administrador', 'entrenador'), ctrl.getAll);
router.post('/',           autorizar('administrador', 'entrenador'), ctrl.create);
router.put('/:id',         autorizar('administrador'),               ctrl.update);
router.put('/:id/reset',   autorizar('administrador'),               ctrl.resetPassword);
router.delete('/:id',      autorizar('administrador'),               ctrl.remove);
router.post('/csv',        autorizar('administrador', 'entrenador'), upload.single('archivo'), ctrl.createFromCSV);

module.exports = router;
