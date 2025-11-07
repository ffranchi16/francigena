import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CalendarComponent } from '../calendar/calendar.component';
import { NotifyService } from '../../../services/notifyService/notify-service';
import { Navbar } from '../../commons/navbar/navbar';

@Component({
  selector: 'gestore-home',
  imports: [CalendarComponent, Navbar],
  templateUrl: './gestore-home.component.html',
  styleUrl: './gestore-home.component.scss',
})
export class GestoreHome implements OnInit {
  username: string = '';
  activatedRoute = inject(ActivatedRoute);
  notifyService = inject(NotifyService);

  async ngOnInit() {
    this.username = this.activatedRoute.snapshot.params?.['username'] || '';
    await this.notifyService.registerPush(this.username); // registrazione dell'utente al sistema di notifiche
  }
}
