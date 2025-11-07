import * as L from 'leaflet';

// serve per far funzionare gpx con ts
declare module 'leaflet' {
  class GPX extends L.FeatureGroup {
    constructor(gpx: string | XMLDocument, options?: any);
  }
}
