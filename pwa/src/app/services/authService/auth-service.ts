import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})

// servizio utilizzato per l'autenticazione e autorizzazione degli utenti
export class AuthService {
  private currentUser: any = null;
  private readonly USER_KEY = 'currentUser'; // chiave dell'oggetto salvato nel local storage del browser
  router = inject(Router);

  constructor() {
    this.caricaUtente();
  }

  // caricamento dell'utente dal local storage
  private caricaUtente(): void {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        this.currentUser = JSON.parse(userData);
      } catch (error) {
        console.error('Errore nel parsing dei dati utente:', error);
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  // login dell'utente e salvataggio nel local storage
  login(username: string, role: string): void {
    this.currentUser = { username: username, ruolo: role };
    localStorage.setItem(this.USER_KEY, JSON.stringify(this.currentUser));
  }

  // logout dell'utente e rimozione dal local storage
  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/']); // dopo il logout reindirizzamento alla home
  }

  // funzione che controlla se l'utente è autenticato
  isAuthenticated(): boolean {
    if (this.currentUser != null) return true;
    return false;
  }

  // funzione che ritorna l'utente corrente
  getCurrentUser(): any {
    return this.currentUser;
  }

  // funzione che controlla se il ruolo passato è quello dell'utente corrente
  hasRole(role: string): boolean {
    return this.currentUser?.ruolo === role;
  }

  // funzione che verifica i permessi dell'utente sulla route passata
  canAccessRoute(route: string): boolean {
    if (!this.isAuthenticated()) return false;

    // se la richiesta è per la route gestore e l'utente ha ruolo non gestore allora questo utente non può accedere alla route richiesta
    if (route.startsWith('/gestore') && !this.hasRole('gestore')) return false;

    if (route.startsWith('/pellegrino') && !this.hasRole('pellegrino'))
      return false;

    // verifica che l'utente stia accedendo alla propria area
    if (route.includes('/home/')) {
      const segmenti = route.split('/');
      const username = segmenti[segmenti.length - 1] || ''; // lo username sarà sempre l'ultimo segmento della route
      return username === this.currentUser.username; // controlla se l'utente con username mario sta accedendo a route/mario
    }
    return true;
  }
}
