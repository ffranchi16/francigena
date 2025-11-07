import webPush from "web-push";
import { Request, Response } from 'express';
import supabase from '../db/db';

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log("Non trovate");
    console.log(webPush.generateVAPIDKeys());
    process.exit();
}

webPush.setVapidDetails(
    `https://localhost:3000`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export async function subscribe(req: Request, res: Response) {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
        res.status(400).json({
            status: 400,
            message: "Dati obbligatori per l'iscrizione",
            details: "UserId e Subscription sono obbligatori per registrarsi all'iscrizione alle notifiche"
        });
        return;
    }
    console.log(subscription);
    try {
        const { data, error } = await supabase
            .from('user')
            .update({ notifySubscription: subscription })
            .eq('username', userId);
        
        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore subscription',
                details: error.message
            });
            return;
        }

        res.status(201).json({
            status: 201,
            message: 'Iscrizione alle notifiche avvenuta con successo',
            data: data
        });
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

export async function sendNotificationById(req: Request, res: Response) {
    const userId = req.params.userId; // userId è una stringa, quindi non è necessaria trasformazione
    const payload = req.body;

    if (!userId || !payload) {
        res.status(400).json({
            status: 400,
            message: "Dati obbligatori per l'invio della notifica",
            details: "UserId e payload della notifica sono obbligatori per il corretto invio della notifica"
        });
        return;
    }

    try {
        const { data, error } = await supabase
            .from('user')
            .select('notifySubscription')
            .eq('username', userId);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero subscription',
                details: error.message
            });
            return;
        }

        if (!data || data.length == 0) {
            console.log('Nessuna subscription per utente', userId);
            res.status(404).json({
                status: 404,
                message: "Non è stata trovata alcuna subscription per l'utente ", userId,
                details: "Prima di inviare una notifica è obbligatorio effettuare un'iscrizione alle notifiche"
            });
            return;
        }


        await webPush.sendNotification(data[0].notifySubscription, JSON.stringify(payload));
        console.log(`Notifica inviata a utente ${userId}`);
        res.status(201).json({
            status: 201,
            message: "Notifica inviata correttamente all'utente ", userId
        });
        return;

    } catch (err) {
        console.error('Errore invio notifica:', err);
        res.status(500).json({
            status: 500,
            message: "Errore invio notifica",
            details: err
        });
        return;
    }
}

export async function notifyGestore(req: Request, res: Response) {
    const { idStruttura, tipo, dataAlloggio } = req.body;

    try {
        // 1. Trova il gestore della struttura
        const { data: struttura, error: errorStruttura } = await supabase
            .from('struttura')
            .select('proprietario, nome')
            .eq('id', idStruttura)
            .single();

        if (errorStruttura || !struttura) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero subscription',
                details: errorStruttura.message
            });
            return;
        }
        

        // 2. Prepara il messaggio in base al tipo
        let title, body;

        if (tipo === 'inserimento') {
            title = 'Nuova prenotazione';
            body = `Hai una nuova prenotazione in data ${dataAlloggio} per la struttura ${struttura.nome}`;
        } else if (tipo === 'cancellazione') {
            title = 'Prenotazione cancellata';
            body = `La prenotazione per il giorno ${dataAlloggio} per la struttura ${struttura.nome} e' stata cancellata`;
        }

        // 3. Invia la notifica push
        await sendPushNotificationToUser(struttura.proprietario, { title, body, url: `${process.env.APP_URL}/pellegrino/home/${struttura.proprietario}` });

        res.status(201).json({
            status: 201,
            message: 'Notifica inviata al gestore'
        });
        console.log("NOTIFICA INVIATA AL GESTORE")

    } catch (error) {
        console.error('Errore notifica gestore:', error);
        res.status(500).json({
            status: 500,
            message: 'Errore interno del server'
        });
    }
}

export async function sendPushNotificationToUser(username: string, payload:any) {
    try {
        const { data, error } = await supabase
            .from('user')
            .select('notifySubscription')
            .eq('username', username)
            .single();

        if (error || !data?.notifySubscription) {
            console.log(`${username} non ha subscription attiva`)
            return;
        }

        await webPush.sendNotification(data.notifySubscription, JSON.stringify(payload));
        console.log(`Notifica inviata a utente ${username}`);
        
    } catch (err) {
        console.error(`Errore invio notifica a ${username}:`, err);
        return;
    }
}

export async function notifyPellegrino(req: Request, res: Response) {
    const { idStruttura, tipo } = req.body;
    const idStrutturaNum = parseInt(idStruttura, 10);
    const dataOdierna = new Date().toISOString().split('T')[0];
    let pellegriniDaNotificare: string[] = [];
    let title: string = "";
    let body: string = "";

    try {

        // Recupero informazioni sulla struttura
        const { data: struttura, error: errorStruttura } = await supabase
            .from('struttura')
            .select('nome, luoghi!inner(id, nome)')
            .eq('id', idStrutturaNum)
        
        if (errorStruttura || !struttura) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero struttura',
                details: errorStruttura.message
            });
            return;
        }
        const luogoStruct = struttura[0].luoghi as unknown as { id: number, nome: string };
        console.log(luogoStruct);
        if (tipo == 'cancellazione') {
            const { data, error } = await supabase
                .from('prenotazione')
                .select('usernamePellegrino')
                .eq('idStruttura', idStrutturaNum)
                .gte('dataAlloggio', dataOdierna);

            if (error || !data) {
                res.status(400).json({
                    status: 400,
                    message: 'Errore notifica cancellazione',
                    details: error.message
                });
                return;
            }
            pellegriniDaNotificare = data.map(p => p.usernamePellegrino);
            title = 'Prenotazione cancellata';
            body = `La struttura ${struttura[0].nome} a ${luogoStruct.nome} dove avevi prenotato non esiste più. Cerca un'altra sistemazione!!!`
        } else if (tipo == 'inserimento') {
            const { data, error } = await supabase
                .from('viaggi')
                .select(`usernamePellegrino, ordineInverso,
                    tappa_partenza: tappe!viaggi_idTappaPartenza_fkey(idLuogo1, idLuogo2),
                    tappa_arrivo: tappe!viaggi_idTappaArrivo_fkey(idLuogo1, idLuogo2)`)
                .gte('dataArrivo', dataOdierna);

            if (error || !data) {
                res.status(400).json({
                    status: 400,
                    message: 'Errore notifica inserimento',
                    details: error.message
                });
                return;
            }

            for (const d of data) {
                const tappaPartenza = d.tappa_partenza as unknown as { idLuogo1: number, idLuogo2: number };
                const tappaArrivo = d.tappa_arrivo as unknown as { idLuogo1: number, idLuogo2: number };
                if (!d.ordineInverso) { // ordine classico, quindi idTappaPartenza < idTappaArrivo, ovvero parto da idTappaPartenza.idLuogo1 e arrivo a idTappaArrivo.idLuogo2
                    console.log("ordine classico");
                    console.log(tappaPartenza);
                    console.log(tappaArrivo);
                    console.log(luogoStruct);
                    if (luogoStruct.id >= tappaPartenza.idLuogo1 &&
                        luogoStruct.id <= tappaArrivo.idLuogo2)
                        pellegriniDaNotificare.push(d.usernamePellegrino);
                } else { // ordine inverso, quindi parto da tappa_partenza.idLuogo2 e arrivo a tappa_arrivo.idLuogo1
                    if (luogoStruct.id >= tappaPartenza.idLuogo2 &&
                        luogoStruct.id <= tappaArrivo.idLuogo1)
                        pellegriniDaNotificare.push(d.usernamePellegrino);
                }
            }
            title = "Prenotazione inserita";
            body = `E' stata inserita una nuova struttura a ${luogoStruct.nome}, se non hai ancora prenotato la tua struttura dai un occhiata!!!`;
        }
        console.log(pellegriniDaNotificare);
        // aspetta che tutte le promise all'interno sia terminate e restituisce un solo risultato anzichè un array di risultati
        const result = await Promise.allSettled(
            pellegriniDaNotificare.map(async (username) => {
                await sendPushNotificationToUser(username, { title, body, url: `${process.env.APP_URL}/pellegrino/home/${username}` })
            })
        )
        res.status(201).json({
            status: 201,
            message: 'Notifica inviata ai pellegrini'
        });
        console.log("NOTIFICA INVIATA AI PELLEGRINI")
    } catch (error) {
        console.error('Errore notifica pellegrini:', error);
        res.status(500).json({
            status: 500,
            message: 'Errore interno del server'
        });
    }
}
