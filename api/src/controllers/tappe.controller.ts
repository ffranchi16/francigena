import { Request, Response } from 'express';
import supabase from '../db/db';

export async function getTappe(req: Request, res: Response) {
    try {
        const { data, error } = await supabase
            .from('tappe')
            .select(`
                *,
                luogo1: luoghi!tappe_idLuogo1_fkey(nome),
                luogo2: luoghi!tappe_idLuogo2_fkey(nome)
            `)
            .order('id');

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero tappe',
                details: error.message
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: 'Tappe recuperate con successo',
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

export async function getLuoghi(req: Request, res: Response): Promise<void> {
    try {
        const { data, error } = await supabase
            .from('luoghi')
            .select(`*`);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero nome luoghi',
                details: error.message
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: 'Luoghi recuperati con successo',
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

/*export async function getPartenze(req: Request, res: Response) {
    try {
        const { data, error } = await supabase
            .from("tappe")
            .select("partenza");

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero partenze',
                details: error.message
            });
            return;
        }

        const partenze = data.map((item) => item.partenza);
        partenze.push("Roma"); // devo aggiungere anche Roma perchè essendo l'arrivo non risulta nelle città di Partenza, ma se uno vuole il percorso al contrario deve anche poter selezionare Roma come città

        res.status(200).json({
            status: 200,
            message: 'Partenze recuperate con successo',
            data: partenze 
        });
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}*/


export async function getTappeViaggio(req: Request, res: Response): Promise<void> {
    try {
        const idViaggio = req.params.idViaggio;
        const { data, error } = await supabase
            .from('tappe_per_viaggio')
            .select(`
                *,
                tappe!inner(
                    id, km, durata, gpx_url,
                    luogo1: luoghi!tappe_idLuogo1_fkey(id, nome),
                    luogo2: luoghi!tappe_idLuogo2_fkey(id, nome)
                )
            `)
            .eq("idViaggio",idViaggio);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero tappe per il viaggio '+idViaggio,
                details: error.message
            });
            return;
        }


        res.status(200).json({
            status: 200,
            message: "Tappe per il viaggio "+idViaggio+"recuperate con successo",
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

export async function getLuoghiViaggio(req: Request, res: Response) {
    try {
        const idViaggio = req.params.idViaggio;
        const { data:dataViaggio, error:errorViaggio } = await supabase
            .from('viaggi')
            .select('ordineInverso, idTappaPartenza, idTappaArrivo')
            .eq("idViaggio", idViaggio);

        if (errorViaggio) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero luoghi per il viaggio ' + idViaggio,
                details: errorViaggio.message
            });
            return;
        }

        let dataLuogo; let errorLuogo;
        if (!dataViaggio[0].ordineInverso) {
            const { data, error } = await supabase
                .from('luoghi')
                .select('id, nome')
                .gte('id', dataViaggio[0].idTappaPartenza)
                .lte('id', dataViaggio[0].idTappaArrivo + 1) // devo sommare 1 perchè ogni tappa x è composta dai luoghi x - x+1
                .order('id', { ascending: true });
            dataLuogo = data; errorLuogo = error;
        } else {
            const { data, error } = await supabase
                .from('luoghi')
                .select('id, nome')
                .gte('id', dataViaggio[0].idTappaArrivo)
                .lte('id', dataViaggio[0].idTappaPartenza+1) 
                .order('id', { ascending: false })
            dataLuogo = data; errorLuogo = error;
        }
        

        if (errorLuogo) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero luoghi per il viaggio ' + idViaggio,
                details: errorLuogo.message
            });
            return;
        }
        console.log(dataLuogo);


        res.status(200).json({
            status: 200,
            message: "Luoghi per il viaggio " + idViaggio + "recuperati con successo",
            data: dataLuogo
        });
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

export async function getInfoStatsViaggi(req: Request, res: Response): Promise<void> {
    const username = req.params.username;
    try {
        const { data, error } = await supabase
            .from('tappe_per_viaggio')
            .select(`
                *,
                tappe!inner(
                    id, km, durata,
                    luogo1: luoghi!tappe_idLuogo1_fkey(id, nome),
                    luogo2: luoghi!tappe_idLuogo2_fkey(id, nome)
                ),
                viaggi!inner(*)
            `)
            .eq("viaggi.usernamePellegrino", username);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero informazioni per statistiche sui viaggi ',
                details: error.message
            });
            return;
        }


        res.status(200).json({
            status: 200,
            message: "Informazioni per statistiche sui viaggi raccolte con successo",
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
