# francigena
App per organizzare e gestire il proprio viaggio sulla via francigena, possibilità di creare account come "Gestore delle strutture" oppure come "Pellegrino"

Monorepo contenente cartella api backend e cartella pwa frontend in Angular

## Funzionalità
### Funzionalità principali del gestore:
- creare e gestire il proprio account
- vedere le prenotazioni che i pellegrini hanno effettuato nelle proprie strutture
- inserire e modificare strutture
- vedere statistiche sulle strutture inserite

### Funzionalità principali del pellegrino:
- creare e gestire il proprio account
- creare un viaggio lungo la via francigena con possibilità di andare da Nord a Sud o viceversa
- prenotare strutture nei luoghi in cui è necessario il pernottamento
- sistemare il proprio viaggio per renderlo perfetto, sistemando date e tappe
- creare una checklist suddivisa in categorie per organizzare al meglio il viaggio

## Credenziali per utenti di prova
- Utente gestore: email: lucia.bianchi@gmail.com, password: lucia123
- Utente pellegrino: email: mario.rossi@gmail.com, password: mario123

## Utilizzo dell'applicazione
- Installare le dipendenze per entrambi i progetti con il comando: npm install
- Prima avviare l'API Server tramite il comando: npm run start
- Creare la build del progetto tramite il comando: npm run build, oppure npm run build-ottimizzata per sfruttare l'ottimizzazione
- Servire l'applicazione con il comando: npx http-server -p 8080 ./dist/pwa-francigena/browser --spa
- Visitare la pagina: http://localhost:8080/
