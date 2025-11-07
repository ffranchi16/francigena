import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
// Servizio per l'autocompletamento delle vie di una città
export class OpenCageService {
  constructor(private http: HttpClient) {}

  searchStreet(
    city: string,
    query: string
  ): Observable<{ name: string; lat: number; lng: number }[]> {
    const url = `${environment.openCageBaseUrl}?q=${encodeURIComponent(
      query + ', ' + city + ', Italia'
    )}&key=${environment.openCageKey}&limit=10&language=it`;

    return this.http.get<any>(url).pipe(
      map((response) => {
        if (!response?.results) return [];
        const uniqueNames = new Set<string>();

        return response.results
          .map((r: any) => ({
            name: r.formatted,
            lat: r.geometry.lat,
            lng: r.geometry.lng,
          }))
          .filter((r: any) => {
            const name = r.name.trim();
            if (uniqueNames.has(name)) return false;
            uniqueNames.add(name);
            return true;
          });
      })
    );
  }
}
