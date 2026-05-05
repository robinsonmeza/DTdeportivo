const { Router } = require('express');
const { getAntropometriaByJugador, createAntropometria, updateAntropometria, deleteAntropometria } = require('../controllers/antropometria.controller');

const router = Router();

router.get('/jugador/:id', getAntropometriaByJugador);
router.post('/', createAntropometria);
router.put('/:id', updateAntropometria);
router.delete('/:id', deleteAntropometria);

module.exports = router;
