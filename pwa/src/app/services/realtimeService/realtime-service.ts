import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  private prenotazioniChanges = new Subject<any>(); // Observable per i cambiamenti delle prenotazioni
  private struttureChanges = new Subject<any>(); // Observable per i cambiamenti delle strutture

  setupRealtimePrenotazioni() {
    const channel = this.supabase
      .channel('prenotazioni-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prenotazione' },
        (payload) => {
          this.prenotazioniChanges.next(payload);
        }
      )
      .subscribe();

    return channel;
  }

  setupRealtimeStrutture() {
    const channel = this.supabase
      .channel('strutture-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'struttura' },
        (payload) => {
          this.struttureChanges.next(payload);
        }
      )
      .subscribe();
    return channel;
  }

  getPrenotazioneChanges(): Observable<any> {
    return this.prenotazioniChanges.asObservable();
  }

  getStruttureChanges(): Observable<any> {
    return this.struttureChanges.asObservable();
  }
}
