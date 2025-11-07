import { Router } from 'express';
import { getPrenotazioniByProprietario, getPrenotazioniByPellegrino, loadNumLetti, setPrenotazione, deletePrenotazione } from '../controllers/prenotazioni.controller';


const router = Router();

router.get('/gestore/:username', getPrenotazioniByProprietario); // GET /prenotazioni/gestore/:username
router.get('/pellegrino', getPrenotazioniByPellegrino); // GET /prenotazioni/pellegrino, con body {username, dataPartenza, dataArrivo}
router.get('/totaleLettiOccupati', loadNumLetti); // GET /prenotazioni/totaleLettiOccupati
router.post('/', setPrenotazione) // SET /prenotazioni, con body {idStruttura, usernamePellegrino, numLetti, dataAlloggio}
router.delete('/', deletePrenotazione) // DELETE /prenotazioni, con body {idStruttura, usernamePellegrino, dataAlloggio}
export default router;
