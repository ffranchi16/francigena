import { Router } from 'express';
import { getUserByUsr, registerUser, signInWithEmail, deleteUser } from '../controllers/user.controller';

const router = Router();

router.get('/:username', getUserByUsr); // GET /users/:username
router.post('/register/:email', registerUser); // POST /users/register/:email, nel body {nome, cognome, username, password, telefono, type}
router.post('/signEmail/:email', signInWithEmail) // POST /users/signEmail/:username, nel body {password, type}. Deve essere POST per motivi di sicurezza perchè con GET sarebbero passate in chiaro
router.delete('/delete/:username', deleteUser); // con body {tipo}
export default router;
