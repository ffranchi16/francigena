import { Router } from 'express';
import { getTappe, getLuoghi, getTappeViaggio, getLuoghiViaggio, getInfoStatsViaggi } from '../controllers/tappe.controller';

const router = Router();

router.get('/', getTappe); // GET /tappe
router.get('/luoghi', getLuoghi) // GET /tappe/luoghi
router.get('/viaggio/:idViaggio', getTappeViaggio) // GET /tappe/viaggio/:idViaggio
router.get('/viaggio/:idViaggio/luoghi', getLuoghiViaggio) // GET /tappe/viaggio/:idViaggio/luoghi
router.get('/stats/:username', getInfoStatsViaggi);
//router.get('/partenze', getPartenze) // GET /tappe/partenze
export default router;