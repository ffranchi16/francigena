import { Request, Response } from 'express';
import supabase from '../db/db';

export async function getPrenotazioniByProprietario(req: Request, res: Response): Promise<void> {
    const username = req.params.username;

    try {
        const {data, error} = await supabase
            .from('prenotazione')
            .select(`
                dataAlloggio,
                numLetti,
                idStruttura,
                usernamePellegrino,
                struttura!inner(id)
            `)
            .eq('struttura.proprietario', username);
        
        if(error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero prenotazioni',
                details: error.message
            });
            return;
        }
        res.status(200).json({
            status: 200,
            message: "Prenotazioni recuperate con successo",
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

export async function getPrenotazioniByPellegrino(req: Request, res: Response): Promise<void> {
    const { username, dataPartenza, dataArrivo } = req.query;

    try {
        const { data, error } = await supabase
            .from('prenotazione')
            .select(`
                *,
                struttura!inner(*)
            `)
            .eq('usernamePellegrino', username)
            .gte('dataAlloggio', dataPartenza)
            .lte('dataAlloggio', dataArrivo);
            

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero prenotazioni',
                details: error.message
            });
            return;
        }
        res.status(200).json({
            status: 200,
            message: "Prenotazioni recuperate con successo",
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

export async function loadNumLetti(req: Request, res: Response): Promise<void> {
    try {
        const { data, error } = await supabase
            .from("lettitotalioccupati")
            .select("*");

        console.log(data);


        console
        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero prenotazioni',
                details: error.message
            });
            return;
        }
        res.status(200).json({
            status: 200,
            message: "Prenotazioni recuperate con successo",
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

export async function setPrenotazione(req: Request, res: Response): Promise<void> {
    const { idStruttura, usernamePellegrino, numLetti, dataAlloggio } = req.body
    const idStrutturaNum = parseInt(idStruttura, 10);
    const numLettiNum = parseInt(numLetti, 10);

    if (!idStrutturaNum || !usernamePellegrino || !numLettiNum || !dataAlloggio) {
        res.status(400).json({
            status: 400,
            message: 'Errore nei dati forniti',
            details: 'I campi sono obbligatori'
        });
        return;
    }

    try {
        const { data: dataLettiTot, error: errorLettiTot } = await supabase
            .from("struttura")
            .select("nLetti")
            .eq("id", idStrutturaNum)

        if (errorLettiTot) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero letti totali della struttura',
                details: errorLettiTot.message
            });
            return;
        }
        console.log(dataLettiTot);

        const { data:dataLettiOccupati, error:errorLettiOccupati } = await supabase
            .from("lettitotalioccupati")
            .select("totletti")
            .eq("idStruttura", idStrutturaNum)
            .eq("dataAlloggio", dataAlloggio);
        
        if (errorLettiOccupati) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero letti occupati',
                details: errorLettiOccupati.message
            });
            return;
        }
        console.log(dataLettiOccupati);
        const lettiOccupati = dataLettiOccupati.length > 0 ? dataLettiOccupati[0].totletti : 0;
        console.log(lettiOccupati);

        if (lettiOccupati + numLettiNum <= dataLettiTot[0].nLetti) {
            const { data: insertData, error: insertError } = await supabase
                .from("prenotazione")
                .insert([{
                    idStruttura: idStrutturaNum,
                    usernamePellegrino,
                    numLetti: numLettiNum,
                    dataAlloggio
                }])

            if (insertError) {
                res.status(400).json({
                    status: 400,
                    message: "Errore durante l'inserimento della prenotazione",
                    details: insertError.message
                });
                return;
            }

            res.status(201).json({
                status: 201,
                message: "Prenotazione inserita con successo",
                data: insertData
            });
        } else {
            res.status(400).json({
                status: 400,
                message: "Errore durante l'inserimento della prenotazione",
                details: "Numero letti disponibili minore di numero letti da prenotare"
            });
            return;
        }
        
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

export async function deletePrenotazione(req: Request, res: Response): Promise<void> {
    const { idStruttura, usernamePellegrino, dataAlloggio } = req.body;
    const idStrutturaNum = parseInt(idStruttura, 10);

    if (!idStrutturaNum || !usernamePellegrino || !dataAlloggio) {
        res.status(400).json({
            status: 400,
            message: 'Errore eliminazione prenotazione',
            details: "Per eliminare la prenotazione è obbligatorio id struttura, username pellegrino e data alloggio"
        });
        return;
    }
    try {
        const { data, error } = await supabase
            .from("prenotazione")
            .delete()
            .eq("idStruttura", idStrutturaNum)
            .eq("usernamePellegrino", usernamePellegrino)
            .eq("dataAlloggio", dataAlloggio)

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore eliminazione prenotazione',
                details: error.message
            });
            return;
        }
        res.status(200).json({
            status: 200,
            message: "Prenotazione eliminata con successo",
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
