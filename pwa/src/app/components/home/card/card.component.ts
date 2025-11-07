import { Component, Input, Output, EventEmitter } from '@angular/core';
import { cardType } from '../../../../typings/custom-type.types';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  @Input() card: cardType = 'pellegrino';
  @Output() loginRequest = new EventEmitter<string>();
  @Output() registerRequest = new EventEmitter<string>();

  get cardConfig() {
    return {
      pellegrino: {
        type: 'pellegrino',
        bg: 'card-pellegrino',
        icon: 'fa-hiking',
        title: 'Sei un pellegrino?',
        description:
          'Organizza il tuo viaggio al meglio e scopri dove alloggiare',
      },
      struttura: {
        type: 'gestore',
        bg: 'card-struttura',
        icon: 'fa-home',
        title: 'Hai una struttura?',
        description:
          'Inseriscila e gestisci le prenotazioni in modo facile e veloce',
      },
    }[this.card];
  }

  openLogin() {
    this.loginRequest.emit(this.cardConfig.type);
  }

  openRegister() {
    this.registerRequest.emit(this.cardConfig.type);
  }
}
