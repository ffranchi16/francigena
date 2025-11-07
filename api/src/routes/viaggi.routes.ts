import { Router } from 'express';
import multer from 'multer';
import { setViaggio, getViaggioAttivo, updateViaggioById, deleteViaggio } from '../controllers/viaggi.controller';

const router = Router();
const upload = multer();

router.post('/:username', upload.none(), setViaggio); // POST /viaggi/:username con body {tappaPartenza, tappaArrivo, dataPartenza, dataArrivo, nPersone, ordineInverso, tappe[] }
router.get('/attivo/:username', getViaggioAttivo); // GET /viaggi/attivo/:username
router.put('/update/:id', upload.none(), updateViaggioById) // UPDATE /viaggi/update/:id con body {idTappaPartenza, idTappaArrivo, dataPartenza, dataArrivo, tappe[]}
router.delete('/delete/:id', deleteViaggio);
export default router;