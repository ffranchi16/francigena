import { Request, Response } from 'express';
import supabase from '../db/db';

export async function insertCategory(req: Request, res: Response) {
    const idViaggio = req.params.idViaggio;
    const { nome } = req.body;

    try {
        const { data, error } = await supabase
            .from('check_category')
            .insert([{
                idViaggio,
                nome
            }])
            .select()
            .single();

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore inserimento nuova categoria nela checklist',
                details: error.message
            });
            return;
        }


        res.status(200).json({
            status: 200,
            message: "Nuova categoria inserita con successo nella checklist",
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

export async function insertItem(req: Request, res: Response) {
    const idCategoria = req.params.idCategoria;
    const { testo } = req.body; 
    try {
        const { data, error } = await supabase
            .from('check_item')
            .insert([{
                idCategoria,
                testo,
                checked: false
            }])
            .select()
            .single();


        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore inserimento nuovo elemento nella checklist',
                details: error.message
            });
            return;
        }


        res.status(200).json({
            status: 200,
            message: "Nuovo elemento inserito con successo nella checklist",
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

export async function deleteItem(req: Request, res: Response) {
    const idItem = req.params.idItem;
    try {
        const { data, error } = await supabase
            .from('check_item')
            .delete()
            .eq("idItem", idItem);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore eliminazione item dalla checklist ',
                details: error.message
            });
            return;
        }


        res.status(200).json({
            status: 200,
            message: "Elemento eliminato correttamente dalla checklist",
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

export async function checkItem(req: Request, res: Response) {
    const idItem = req.params.idItem;
    const { checked } = req.body;

    try {
        const { data, error } = await supabase
            .from('check_item')
            .update({checked})
            .eq("idItem", idItem);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore modifica elemento della checklist ',
                details: error.message
            });
            return;
        }


        res.status(200).json({
            status: 200,
            message: "Elemento della checklist modificato con successo",
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

export async function getChecklist(req: Request, res: Response) {
    const idViaggio = req.params.idViaggio;
    try {
        const { data, error } = await supabase
            .from('check_category')
            .select(`
                *,
                check_item(*)
            `)
            .eq("idViaggio", idViaggio);

        if (error) {
            res.status(400).json({
                status: 400,
                message: 'Errore recupero checklist',
                details: error.message
            });
            return;
        }


        res.status(200).json({
            status: 200,
            message: "Checklist recuperate con successo",
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