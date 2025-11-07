import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { Injectable } from '@angular/core';
import { AuthService } from '../../services/authService/auth-service';

@Injectable({
  providedIn: 'root',
})
// CanActive guard intercetta le richieste di cambio route e controlla l'autenticazione e l'autorizzazione
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    // UrlTree serve per fare il redirect ad un'altro url
    if (!this.authService.isAuthenticated()) {
      // Se l'utente non è autenticato, reindirizza alla home
      this.router.navigate(['/']);
      return false;
    }

    // Se l'utente è autenticato ma non può accedere a questa route
    if (!this.authService.canAccessRoute(state.url)) {
      this.redirectToUserHome();
      return false;
    }
    return true;
  }

  // funzione per decidere a quale route reindirizzare l'utente rispetto al suo ruolo
  private redirectToUserHome() {
    const user = this.authService.getCurrentUser();
    if (user?.ruolo === 'gestore')
      this.router.navigate([`/gestore/home/${user.username}`]);
    else if (user?.ruolo === 'pellegrino')
      this.router.navigate([`/pellegrino/home/${user.username}`]);
    else this.router.navigate(['/']);
  }
}
