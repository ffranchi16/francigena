import { Request, Response } from 'express';
import supabase from '../db/db';

export async function getAllStrutture(req: Request, res: Response): Promise<void> {
    try {
        const { data, error } = await supabase
            .from('struttura')
            .select('*, user:user!struttura_proprietario_fkey(nome, cognome, telefono)')
            

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero strutture',
                details: error.message
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: 'Strutture recuperate con successo',
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

// c'è sempre il problema che non si possono riconoscere gli errori 404 perchè la lista è sempre vuota, quindi non si capisce se è vuota perchè un gestore non ha strutture o perchè un utente non è registrato
export async function getStruttureByUsr(req: Request, res: Response): Promise<void> {
    const username = req.params.username;
    try {
        const {data, error} = await supabase
            .from('struttura')
            .select('*')
            .eq('proprietario', username);

        if(error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero strutture',
                details: error.message
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: 'Strutture recuperate con successo',
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

export async function getColoriUsati(req: Request, res: Response): Promise<void> {
    const username = req.params.username;

    try {
        const {data, error} = await supabase
            .from('struttura')
            .select('colore')
            .eq('proprietario', username);

        if(error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero colori usati',
                details: error.message
            });
            return;
        }

        const coloriUsati = data.map((item) => item.colore);
        res.status(200).json({
            status: 200,
            message: 'Colori usati recuperati con successo',
            data: coloriUsati
        });
    } catch (err) {
        res.status(500).json({ 
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

// l'id della struttura viene generato automaticamente da Supabase, per questo non è necessario passarlo
export async function addStruttura(req: Request, res: Response): Promise<void> {
    const { nome, idLuogo, viaNome, viaLat, viaLon, civico, nLetti, altreInfo, colore, proprietario } = req.body;
    const foto = req.file // prendo la foto
    const idLuogoNum = parseInt(idLuogo, 10);
    const civicoNum = parseInt(civico, 10);
    const nLettiNum = parseInt(nLetti, 10);
    const viaLatNum = parseFloat(viaLat);
    const viaLonNum = parseFloat(viaLon);

    // altreInfo è l'unico campo opzionale
    if (!nome || !idLuogoNum || !viaNome || !viaLatNum || !viaLonNum || !civicoNum || !nLettiNum || !colore || !proprietario || !foto) {
        res.status(400).json({
            status: 400,
            message: 'Errore nei dati forniti',
            details: 'I campi nome, citta, via, civico, cap, nLetti, colore, proprietario e foto sono obbligatori'
        });
        return;
    }
    if (!foto) {
        res.status(400).json({
            status: 400,
            message: "Nessun file caricato"
        });
        return;
    }
    try {
        // inserimento foto nello storage
        const fotoData = await uploadFoto(foto);

        // inserimento nel database
        const { data: insertData, error: insertError } = await supabase
            .from('struttura')
            .insert([{
                nome,
                idLuogo: idLuogoNum,
                via: viaNome,
                viaLat: viaLatNum,
                viaLon: viaLonNum,
                civico: civicoNum,
                nLetti: nLettiNum,
                altreInfo,
                colore,
                proprietario,
                url: fotoData?.path
            }])
            .select()
            .single();

        if(insertError) {
            // tolgo dallo storage la foto caricata per avere consistenza
            if(fotoData) await rimuoviFoto(fotoData.path); // non interessa se l'eliminazione è andata a buon fine perchè ritorno comunque un errore
            res.status(400).json({ 
                status: 400,
                message: "Errore durante l'inserimento della struttura",
                details: insertError.message
            });
            return;
        }
        
        res.status(201).json({ 
            status: 201,
            message: 'Struttura aggiunta con successo',
            data: insertData
        });
    } catch (err) {
        res.status(500).json({ 
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

async function uploadFoto(file: Express.Multer.File) {
    const { data, error } = await supabase.storage
        .from("StructImg")
        .upload(file.originalname, file.buffer, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.mimetype,
        });

    if (error) throw new Error(error.message);
    return data;
}

async function rimuoviFoto(path: string): Promise<{ data: any; error: any }> {
    return await supabase.storage
    .from('StructImg')
    .remove([path]);
}

export async function getPublicUrl(req:Request, res:Response): Promise<void> {
    const path = req.params.path; // percorso della foto nello storage
    if(path === null) {
        res.status(400).json({ 
            status: 400,
            message: 'Errore nei dati forniti',
            details: 'Il campo path è obbligatorio'
        });
        return;
    }

    try {
        const {data} = supabase.storage
            .from('StructImg')
            .getPublicUrl(path);

        if(data === null) {
            res.status(404).json({ 
                status: 404,
                message: 'Foto non trovata',
                details: "La foto con il path "+ path + " non esiste"
            });
            return;
        } 

        res.status(200).json({ 
            status: 200,
            message: 'Foto recuperata con successo',
            data: data.publicUrl
        });
    } catch (err) {
        res.status(500).json({ 
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

// per essere RESTful l'id deve essere passato come parametro e il resto nel body
export async function modifyStruttura(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    const idNum = parseInt(id, 10);
    const {changeImg, originalImgUrl, nome, idLuogo, viaNome, viaLat, viaLon, civico, nLetti, altreInfo, colore, proprietario} = req.body;
    const foto = req.file // prendo la foto
    const idLuogoNum = parseInt(idLuogo, 10);
    const civicoNum = parseInt(civico, 10);
    const nLettiNum = parseInt(nLetti, 10);
    const viaLatNum = parseFloat(viaLat);
    const viaLonNum = parseFloat(viaLon);
    
    let url = originalImgUrl; // se l'immagine non cambia rimane la stessa

    if (!idNum || !originalImgUrl || !nome || !idLuogoNum || !viaNome || !viaLatNum || !viaLonNum || !civicoNum || !nLettiNum || !colore || !proprietario) {
        res.status(400).json({
            status: 400,
            message: 'Errore nei dati forniti',
            details: 'I campi sono obbligatori'
        });
        return;
    }
    try {
        // se changeImg è true allora l'immagine è cambiata e devo eliminare la vecchia e caricare la nuova
        console.log(changeImg);
        if (changeImg === "true") { // è diventata una stringa dopo il passaggio dall'api
            // elimino la vecchia foto
            const { data: deleteData, error: deleteError } = await rimuoviFoto(originalImgUrl);
            if (deleteError) {
                res.status(400).json({
                    status: 400,
                    message: "Errore durante la rimozione della foto dallo storage",
                    details: deleteError.message
                });
                return;
            }

            if (!foto) {
                res.status(400).json({
                    status: 400,
                    message: "Nessun file caricato"
                });
                return;
            }

            // carico la nuova foto
            console.log("foto: ");
            console.log(foto);
            const fotoData = await uploadFoto(foto!);
            url = fotoData?.path || '';
        }
        
        
        const {data: updateData, error: updateError} = await supabase
            .from('struttura')
            .update({
                nome,
                idLuogo: idLuogoNum,
                via: viaNome,
                viaLat: viaLatNum,
                viaLon: viaLonNum,
                civico: civicoNum,
                nLetti: nLettiNum,
                altreInfo,
                colore,
                proprietario,
                url: url
            })
            .eq('id', idNum)

        if(updateError) {
            res.status(400).json({ 
                status: 400,
                message: "Errore durante la modifica della struttura",
                details: updateError.message
            });
            return;
        }

        res.status(200).json({ 
            status: 200,
            message: 'Struttura modificata con successo',
            data: updateData
        });
    } catch (err) {
        res.status(500).json({ 
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

export async function deleteStruttura(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    const idNum = parseInt(id, 10);
    const {fotoUrl} = req.body; // url della foto da eliminare

    if(!idNum || !fotoUrl) {
        res.status(400).json({
            status: 400,
            message: 'Errore nei dati forniti',
            details: 'I campi id e fotoUrl sono obbligatori'
        });
        return;
    }

    try {
        const {data: dataFoto, error: errorFoto} = await rimuoviFoto(fotoUrl);
        if(errorFoto) {
            res.status(400).json({ 
                status: 400,
                message: "Errore durante la rimozione della foto dallo storage",
                details: errorFoto.message
            });
            return;
        }

        const {data: dataDb, error: errorDb} = await supabase
            .from('struttura')
            .delete()
            .eq('id', idNum);
        
        if(errorDb) {
            res.status(400).json({
                status: 400,
                message: "Errore durante l'eliminazione della struttura dal database",
                details: errorDb.message
            });
        }

        res.status(200).json({ 
            status: 200,
            message: 'Struttura eliminata con successo',
            data: dataDb
        });
        console.log("Struttura eliminata");
    } catch (err) {
        res.status(500).json({ 
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
        return;
    }
    
}

export async function getStrutturaById(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    console.log("id: "+id);
    const idNum = parseInt(id, 10);
    try {
        const { data, error } = await supabase
            .from('struttura')
            .select('*, user:user!struttura_proprietario_fkey(nome, cognome, telefono)')
            .eq('id', idNum);

        if (error) {
            res.status(400).json({
                status: 400,
                message: "Errore recupero struttura dall'id",
                details: error.message
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: 'Struttura recuperata con successo',
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