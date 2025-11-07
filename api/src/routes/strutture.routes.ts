import { Router } from 'express';
import multer from 'multer';
import { getAllStrutture, getStruttureByUsr, getColoriUsati, addStruttura, getPublicUrl, modifyStruttura, deleteStruttura, getStrutturaById } from '../controllers/strutture.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getAllStrutture); // GET /strutture
router.get('/username/:username', getStruttureByUsr); // GET /strutture/username/:username
router.get('/coloriUsati/:username', getColoriUsati); // GET /strutture/coloriUsati/:username
router.post('/', upload.single("foto"), addStruttura); // POST /strutture, con body {nome, citta, via, civico, cap, nLetti, altreInfo, colore, proprietario, foto}
router.get('/foto/:path', getPublicUrl); // GET /strutture/foto/:path
router.put('/:id', upload.single("foto"), modifyStruttura); // PUT /strutture/:id, con body {changeImg, originalImgUrl, nome, citta, via, civico, cap, nLetti, altreInfo, colore, proprietario, foto}
router.delete('/:id', deleteStruttura); // DELETE /strutture/:id, con body {fotoUrl}
router.get('/id/:id', getStrutturaById) // GET /strutture/:id
export default router;