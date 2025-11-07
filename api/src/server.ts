import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from "cors";
import userRoutes from './routes/user.routes';
import struttureRoutes from './routes/strutture.routes';
import prenotazioniRoutes from './routes/prenotazioni.routes';
import tappeRoutes from './routes/tappe.routes';
import viaggiRotues from './routes/viaggi.routes';
import notifyRoutes from './routes/pushServer.routes';
import checklist from './routes/checklist.routes';

const app = express();
app.use(express.json());
app.use(cors());

app.use('/users', userRoutes);
app.use('/strutture', struttureRoutes);
app.use('/prenotazioni', prenotazioniRoutes);
app.use('/tappe', tappeRoutes);
app.use('/viaggi', viaggiRotues);
app.use('/notify', notifyRoutes);
app.use('/checklist', checklist);

app.listen(process.env.PORT, () => {
    console.log('API attiva su http://localhost:'+process.env.PORT);
});
