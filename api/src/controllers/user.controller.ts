import { Request, Response } from 'express';
import supabase from '../db/db';
import { deleteStruttura } from '../controllers/strutture.controller'

// error è un errore interno a supabase, mentre err catturato dal catch è un errore generico
export async function getUserByUsr(req: Request, res: Response): Promise<void> {
  const username = req.params.username;
  try {
      const { data, error } = await supabase
          .from('user')
          .select(`email, nome, cognome, telefono, username, type`)
          .eq('username', username)
          .single();
    
    if(error) {
      res.status(400).json({ 
        status: 400,
        message: 'Errore recupero utente',
        details: error.message
      });
      return;
    }

    if(!data) {
      res.status(404).json({
        status: 404,
        message: 'Utente non trovato',
        details: "L'utente con lo username "+ username + " non esiste"
      });
      return;
    }
    
    res.status(200).json({
      status: 200,
      message: 'Utente recuperato con successo',
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

export async function registerUser(req: Request, res: Response): Promise<void> {
    const email = req.params.email;
    const { nome, cognome, username, password, telefono, type } = req.body;
  
  // tutti i campi sono obbligatori
  if(!email || !nome || !cognome || !username || !password || !telefono || !type) {
    res.status(400).json({ 
      status: 400,
      message: 'Dati mancanti',
      details: 'Tutti i campi sono obbligatori'
    });
    return;
  }

    try {
        // inserimento dell'utente nel servizio di autenticazione
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) {
            res.status(400).json({
                status: 400,
                message: 'Errore inserimento utente nel servizio di autenticazione',
                details: authError.message
            });
            return;
        }

    // inserimento dell'utente nel database
    const {data: insertData, error: profileError} = await supabase
      .from('user')
        .insert([{
            auth_user_id: authData.user!.id,
          nome: nome,
          cognome: cognome,
          username: username,
          email: email,
          telefono: telefono,
          type: type
        }])
      .select()
      .single(); // ritorna come singolo oggetto
    
    // mantengo il database consistente, quindi se c'è un errore rimuovo l'utente inserito
    if (profileError) {
        await supabase.auth.admin.deleteUser(authData.user!.id);
        res.status(400).json({ 
        status: 400,
        message: 'Errore inserimento utente nel servizio di autenticazione',
        details: profileError.message
        });
        return;
    }

    res.status(201).json({
      status: 201,
      message: 'Utente registrato con successo',
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

export async function signInWithEmail(req: Request, res: Response): Promise<void> {
    const email = req.params.email;
    const { password, type } = req.body;

    if (!email || !password || !type) {
        res.status(400).json({
            status: 400,
            message: 'Dati mancanti',
            details: 'Tutti i campi sono obbligatori'
        });
        return;
    }

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            res.status(400).json({
                status: 400,
                message: "Errore durante il login",
                details: authError.message
            });
            return;
        }

        // Recupero dei dati dalla tabella
        const { data: dataResearch, error: errorResearch } = await supabase
            .from('user')
            .select('*')
            .eq('auth_user_id', authData.user.id)
            .single();

        if (errorResearch) {
            res.status(400).json({
                status: 400,
                message: "Errore nella ricerca dell'utente",
                details: errorResearch.message
            });
            return;
        }
        if (dataResearch.length === 0) {
            res.status(404).json({
                status: 404,
                message: "Utente non registrato",
                details: "Per effettuare il login l'utente deve essere prima registrato"
            });
            return;
        }
        if (dataResearch.type !== type) {
            res.status(403).json({
                status: 403,
                message: "Utente non autorizzato al login",
                details: "Utente registrato come: " + dataResearch.type
            });
            return;
        }
        
        res.status(201).json({
            status: 201,
            message: 'Login avvenuto con successo',
            data: dataResearch
        });
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: 'Errore interno del server',
            details: err
        });
    }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
    const username = req.params.username;
    const { tipo } = req.body;
    try {
        console.log(tipo);
        if (tipo == "gestore") { // prima di eliminare le strutture associate devo eliminare anche tutte le foto nello storage
            const { data: strutture, error: errorStrutture } = await supabase
                .from('struttura')
                .select('id, url')
                .eq('proprietario', username);

            console.log(strutture);        
            if (errorStrutture) {
                res.status(400).json({
                    status: 400,
                    message: 'Errore ricerca strutture',
                    details: errorStrutture.message
                });
                return;
            }

            for (const struct of strutture) {
                // per riutilizzare la funzione deleteStruttura devo ricreare gli oggetti req e res per passarglieli
                const newReq = {
                    params: { id: struct.id.toString() },
                    body: { fotoUrl: struct.url }
                } as unknown as Request;

                const newRes = {
                    status: (code: number) => newRes,
                    json: (data: any) => { return newRes; }
                } as Response;

                await deleteStruttura(newReq, newRes);
            }
        }




        const { data, error } = await supabase
            .from('user')
            .delete()
            .eq('username', username);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore eliminazione utente',
                details: error.message
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: 'Utente eliminato con successo',
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
