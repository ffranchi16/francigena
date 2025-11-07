import { Request, Response } from 'express';
import supabase from '../db/db';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

interface TappaInput {
    idTappa: number,
    dataPercorrenza: string,
    nomeTappa: string
}

interface TappaViaggio extends TappaInput {
    idViaggio: number
}

interface Viaggio {
    idViaggio: number,
    usernamePellegrino: string,
    idTappaPartenza: number,
    idTappaArrivo: number,
    dataPartenza: string,
    dataArrivo: string,
    nPersone: number,
    ordineInverso: boolean
}

export async function setViaggio(req: Request, res: Response): Promise<void> {
    try {
        const username = req.params.username;
        const { idTappaPartenza, idTappaArrivo, dataPartenza, dataArrivo, nPersone, ordineInverso, maxOre, tappe } = req.body;
        const nPersoneNum = parseInt(nPersone, 10);
        const maxOreNum = parseFloat(maxOre)
        const ordineInv: boolean = ordineInverso === "true";
        const idTP = parseInt(idTappaPartenza, 10);
        const idTA = parseInt(idTappaArrivo, 10);

        if (!dataPartenza || !dataArrivo) {
            res.status(400).json({
                status: 400,
                message: 'Errore nei dati forniti',
                details: 'Tutti i campi sono obbligatori'
            });
            return;
        }

        // inserimento del viaggio generale
        const { data, error }: PostgrestSingleResponse<Viaggio[]> = await supabase
            .from('viaggi')
            .insert([{
                usernamePellegrino: username,
                idTappaPartenza: idTP,
                idTappaArrivo: idTA,
                dataPartenza,
                dataArrivo,
                nPersone: nPersoneNum,
                ordineInverso: ordineInv,
                maxOre: maxOreNum
            }])
            .select();

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore inserimento viaggio',
                details: error.message
            });
            return;
        }

        const tappeInput: TappaInput[] = [];
        const tappeViaggio: TappaViaggio[] = [];
        for (let i = 0; i < tappe.length; i++) tappeInput.push(JSON.parse(tappe[i]));

        tappeInput.forEach((tappa) => {
            tappeViaggio.push({
                idViaggio: data[0].idViaggio,
                idTappa: tappa.idTappa,
                dataPercorrenza: tappa.dataPercorrenza,
                nomeTappa: tappa.nomeTappa
            });
        })

        const { data: dataTappe, error: errorTappe } = await supabase
            .from('tappe_per_viaggio')
            .insert(tappeViaggio)

        if (errorTappe) {
            // mantengo la consistenza nel db eliminando il viaggio già inserito
            const { data: deleteData, error: deleteError } = await supabase
                .from('viaggi')
                .delete()
                .eq('idViaggio', data[0].idViaggio);

            res.status(400).json({
                status: 400,
                message: 'Errore inserimento tappe',
                details: errorTappe.message
            });
            return;
        }

        res.status(201).json({
            status: 201,
            message: 'Viaggio inserito con successo',
            data: data
        });
    } catch (err) {
        console.log("Errore" + err);
        res.status(500).json({
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

export async function getViaggioAttivo(req: Request, res: Response): Promise<void> {
    const username: string = req.params.username;
    const dataAttuale: string = new Date().toISOString().split('T')[0];

    console.log(dataAttuale);

    try {
        const { data, error } = await supabase
            .from('viaggi')
            .select('*')
            .eq('usernamePellegrino', username)
            .gte('dataArrivo', dataAttuale); // dataArrivo >= dataAttuale, quindi viaggi che non sono ancora terminati
        
        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero viaggio in corso',
                details: error.message
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: 'Viaggio recuperato con successo',
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

export async function updateViaggioById(req: Request, res: Response): Promise<void> {
    const idViaggio: string = req.params.id;
    const idViaggioNum: number = parseInt(idViaggio, 10);
    const { dataPartenza, dataArrivo, idTappaPartenza, idTappaArrivo, tappe } = req.body;
    console.log(dataPartenza + " " + dataArrivo + " " + idTappaPartenza + " " + idTappaArrivo);
    const idTP = parseInt(idTappaPartenza, 10);
    const idTA = parseInt(idTappaArrivo, 10);

    try {

        const { data: dataRemove, error: errorRemove } = await supabase
            .from('tappe_per_viaggio')
            .delete()
            .eq('idViaggio', idViaggioNum);

        if (errorRemove) {
            res.status(400).json({
                status: 400,
                message: 'Errore eliminazione tappe per viaggio',
                details: errorRemove.message
            });
            return;
        }

        // update del viaggio
        const { data, error }: PostgrestSingleResponse<Viaggio[]> = await supabase
            .from('viaggi')
            .update([{
                idTappaPartenza: idTP,
                idTappaArrivo: idTA,
                dataPartenza,
                dataArrivo
            }])
            .eq('idViaggio', idViaggioNum)
            .select()
            .single();

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore update viaggio',
                details: error.message
            });
            return;
        }

        const tappeInput: TappaInput[] = [];
        const tappeViaggio: TappaViaggio[] = [];
        for (let i = 0; i < tappe.length; i++) tappeInput.push(JSON.parse(tappe[i]));

        tappeInput.forEach((tappa) => {
            tappeViaggio.push({
                idViaggio: idViaggioNum,
                idTappa: tappa.idTappa,
                dataPercorrenza: tappa.dataPercorrenza,
                nomeTappa: tappa.nomeTappa
            });
        })

        const { data: dataTappe, error: errorTappe } = await supabase
            .from('tappe_per_viaggio')
            .insert(tappeViaggio)

        if (errorTappe) {
            // mantengo la consistenza nel db eliminando il viaggio già inserito
            const { data: deleteData, error: deleteError } = await supabase
                .from('viaggi')
                .delete()
                .eq('idViaggio', idViaggioNum);

            res.status(400).json({
                status: 400,
                message: 'Errore inserimento tappe',
                details: errorTappe.message
            });
            return;
        }

        res.status(201).json({
            status: 201,
            message: 'Viaggio aggiornato con successo',
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


export async function deleteViaggio(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('viaggi')
            .delete()
            .eq('idViaggio', id);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore eliminazione viaggio',
                details: error.message
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: 'Viaggio eliminato con successo',
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
