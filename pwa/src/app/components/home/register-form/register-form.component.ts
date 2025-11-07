import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { RegisterData } from '../../../../typings/custom-type.types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'register-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss',
})
export class RegisterFormComponent {
  notifyService = inject(NotifyService);
  showRegister = false;
  registerData: RegisterData = {
    nome: '',
    cognome: '',
    username: '',
    email: '',
    telefono: '',
    password: '',
    passwordC: '',
  };
  registerType: string = '';
  error = '';

  openRegister(registerType: string) {
    this.showRegister = true;
    this.registerType = registerType;
  }

  closeRegister() {
    this.showRegister = false;
    this.registerType = '';
  }

  async onRegister() {
    if (!this.checkRegisterCredential()) return;

    const res = await fetch(
      `${environment.apiUrl}/users/register/${this.registerData.email}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: this.registerData.nome,
          cognome: this.registerData.cognome,
          username: this.registerData.username,
          telefono: this.registerData.telefono,
          password: this.registerData.password,
          type: this.registerType,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      this.notifyService.showSnackbar(data.message);
      return;
    }
    this.notifyService.showSuccessoOperazione('Registrazione');
    this.showRegister = false;
    this.registerData = {
      nome: '',
      cognome: '',
      username: '',
      email: '',
      telefono: '',
      password: '',
      passwordC: '',
    };
  }

  private checkRegisterCredential(): boolean {
    if (
      !this.registerData.nome ||
      !this.registerData.cognome ||
      !this.registerData.username ||
      !this.registerData.email ||
      !this.registerData.telefono ||
      !this.registerData.password ||
      !this.registerData.passwordC
    ) {
      this.error = 'Tutti i campi sono obbligatori!!!';
      return false;
    }

    if (this.registerData.password !== this.registerData.passwordC) {
      this.error = 'Le password non corrispondono!!!';
      return false;
    }

    if (!this.registerData.email.includes('@')) {
      this.error = 'Email non valida!!!';
      return false;
    }

    if (this.registerData.password.length < 6) {
      this.error = 'La password deve essere di almeno 6 caratteri!!!';
      return false;
    }

    if (this.registerData.telefono.length != 10) {
      this.error = 'Il numero di telefono deve avere 10 cifre!!!';
    }

    return true;
  }
}
