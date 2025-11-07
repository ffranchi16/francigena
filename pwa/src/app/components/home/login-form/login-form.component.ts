import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { AuthService } from '../../../services/authService/auth-service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'login-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
})
export class LoginFormComponent {
  router = inject(Router);
  notifyService = inject(NotifyService);
  authService = inject(AuthService);
  showLogin = false;
  credenziali = { email: '', password: '' };
  loginType: string = '';
  username: string = '';
  error: string = '';

  openLogin(loginType: string) {
    this.showLogin = true;
    this.loginType = loginType;
    this.error = '';
  }

  closeLogin() {
    this.showLogin = false;
    this.loginType = '';
    this.error = '';
  }

  async onLogin() {
    if (!this.checkLoginCredential(this.credenziali)) return;

    const res = await fetch(
      `${environment.apiUrl}/users/signEmail/${this.credenziali.email}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: this.credenziali.password,
          type: this.loginType,
        }),
      }
    );
    const data = await res.json();
    this.credenziali = { email: '', password: '' };

    if (!res.ok) {
      this.notifyService.showSnackbar('Login fallito');
      return;
    }

    this.username = data.data.username?.toLowerCase();
    this.showLogin = false;

    this.authService.login(this.username, this.loginType); // salvo nel locale storage l'utente

    this.loginType === 'pellegrino' // reindirizzamento alla home
      ? this.router.navigate(['/pellegrino/home', this.username])
      : this.router.navigate(['/gestore/home', this.username]);
  }

  // funzione che controlla il corretto riempimento dei campi del form
  private checkLoginCredential(credenziali: {
    email: string;
    password: string;
  }): boolean {
    if (!credenziali.email || !credenziali.password) {
      this.error = 'Tutti i campi sono obbligatori!!!';
      return false;
    }

    if (!credenziali.email.includes('@')) {
      this.error = 'Email non valida!!!';
      return false;
    }

    if (credenziali.password.length < 6) {
      this.error = 'La password deve essere di almeno 6 caratteri!!!';
      return false;
    }

    return true;
  }
}
