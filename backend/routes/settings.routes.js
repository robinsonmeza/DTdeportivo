const { Router } = require('express')
const { getTeamSettings, uploadTeamLogo, uploadMiddleware } = require('../controllers/settings.controller')

const router = Router()

router.get('/team', getTeamSettings)
router.post('/team/logo', uploadMiddleware, uploadTeamLogo)

module.exports = router
