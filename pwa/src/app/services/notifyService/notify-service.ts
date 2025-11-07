import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotifyService {
  private snackBar = inject(MatSnackBar);

  private isOnline = true;
  private connectionSnackBar: any;

  constructor() {
    this.setupConnectionListeners();
  }

  // Setup per inviare lo snackbar in caso di mancata connessione
  private setupConnectionListeners(): void {
    if (typeof window !== 'undefined') {
      // Listener per quando va offline
      window.addEventListener('offline', () => {
        this.handleOffline();
      });

      // Listener per quando torna online
      window.addEventListener('online', () => {
        this.handleOnline();
      });

      // Check iniziale
      this.isOnline = navigator.onLine;
    }
  }

  private handleOffline() {
    this.isOnline = false;
    this.connectionSnackBar = this.snackBar.open(
      'Connessione internet assente, alcune funzionalità potrebbero non funzionare correttamente',
      'OK',
      {
        duration: 0, // Rimane finchè non viene chiusa manualmente
        verticalPosition: 'bottom',
        horizontalPosition: 'center',
        panelClass: ['offline-snackbar'],
      }
    );
  }

  private handleOnline() {
    this.isOnline = true;
    if (this.connectionSnackBar) {
      this.connectionSnackBar.dismiss();
      this.connectionSnackBar = null;
    }
    this.snackBar.open('Connessione internet ripristinata', 'OK', {
      duration: environment.snackBarTimeout,
      verticalPosition: 'bottom',
      horizontalPosition: 'center',
      panelClass: ['online-snackbar'],
    });
  }

  // snackbar
  showSnackbar(message: string) {
    this.snackBar.open(message, '', {
      duration: environment.snackBarTimeout,
      verticalPosition: 'bottom',
      horizontalPosition: 'center',
      panelClass: ['notification-snackbar'],
    });
  }

  // invio notifiche locali
  private async showNotificheLocali(title: string, option: any) {
    if (!this.notificheSupportate()) return;
    const permessi = await this.getPermessiNotifiche();
    if (permessi !== 'granted') return;

    try {
      // creazione notifica
      const notifica = new Notification(title, {
        ...this.getDefaultOption(),
        ...option,
      }); // prende prima le opzioni di defualt e poi ne sostituisce alcune con le opzioni passate
      notifica.onclick = () => {
        notifica.close();
      };
      setTimeout(() => {
        if (notifica.close) notifica.close();
      }, environment.notificationTimeout);
    } catch (error) {
      console.error('Errore creazione notifica: ', error);
    }
  }

  // funzione utilizzato per mostrare le notifiche per operazioni che hanno avuto successo
  showSuccessoOperazione(operazione: string) {
    this.showNotificheLocali('Successo', {
      body: operazione + ' avvenuta con successo',
      icon: '/assets/icon/success.png',
      badge: '/assets/icon/success.png',
      tag: 'success',
    });
  }

  // funzione utilizzato per mostrare le notifiche per operazioni che sono fallite
  showFallimentoOperazione(operazione: string) {
    this.showNotificheLocali('Errore', {
      body: operazione + ' fallito',
      icon: '/assets/icon/error.png',
      badge: '/assets/icon/error.png',
      tag: 'error',
    });
  }

  // funzione utilizzato per controllare se il browser supporta le notifiche
  private notificheSupportate() {
    if ('Notification' in window) return true;
    return false;
  }

  // funzione utilizzato per controllare se l'utente ha dato il permesso all'invio di notifiche
  private async getPermessiNotifiche() {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';

    try {
      // in caso la richiesta di permesso sia stata chiusa senza nè accettare nè rifiutare viene richiesta
      return await Notification.requestPermission();
    } catch (error) {
      console.error('Errore richiesta permesso notifiche: ', error);
      return 'denied';
    }
  }

  // funzione utilizzato per le opzioni di default delle notifiche
  private getDefaultOption() {
    return {
      icon: '/assets/icon/logo.png',
      badge: '/assets/icon/logo.png',
      vibrate: [100, 50, 100],
      tag: 'general',
      requireInteraction: false,
      silent: false,
    };
  }

  // Notifiche push
  async registerPush(userId: string) {
    if (!this.notificheSupportate()) return;
    const permessi = await this.getPermessiNotifiche();
    if (permessi !== 'granted') return;
    // Assicura che il service worker sia attivo
    const reg = await navigator.serviceWorker.ready;

    // Conversione della chiave pubblica da Base64URL a Uint8Array
    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const rawData = window.atob(base64);
      return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    };

    // Iscrizione al PushManager
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(environment.vapidPublicKey),
    });

    // Invio della nuova subscription al db
    await fetch(`${environment.apiUrl}/notify/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription }),
    });
  }

  // funzione per inviare la notifica ai gestori
  async notifyGestore(tipo: string, idStruttura: number, dataAlloggio: string) {
    const response = await fetch(`${environment.apiUrl}/notify/gestore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idStruttura,
        tipo,
        dataAlloggio,
      }),
    });
  }

  // funzione per inviare la notifica ai pellegrini
  async notifyPellegrini(tipo: string, idStruttura: number) {
    const response = await fetch(`${environment.apiUrl}/notify/pellegrino`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idStruttura,
        tipo,
      }),
    });
  }
}
