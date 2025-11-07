import { Router } from 'express';
import { subscribe, sendNotificationById, notifyGestore, notifyPellegrino } from '../controllers/pushServer.controller';

const router = Router();

router.post('/subscribe', subscribe); // POST /notify/subscribe, con body {userId, subscription}
router.post('/send/:userId', sendNotificationById); // POST /notify/send/:userId, con body {payload}
router.post('/gestore', notifyGestore);
router.post('/pellegrino', notifyPellegrino);
export default router;