import { Router } from 'express';
import { insertCategory, insertItem, deleteItem, checkItem, getChecklist } from '../controllers/checklist.controller'
const router = Router();

router.post('/category/:idViaggio', insertCategory); // con body {nome}
router.post('/item/:idCategoria', insertItem); // con body {testo}
router.delete('/item/:idItem', deleteItem);
router.put('/item/check/:idItem', checkItem); // con body {checked}
router.get('/:idViaggio', getChecklist);

export default router;