export type cardType = 'pellegrino' | 'struttura';

export interface RegisterData {
  nome: string, 
  cognome: string, 
  username: string, 
  email: string, 
  telefono: string, 
  password: string, 
  passwordC: string
}

export interface UserInfo {
  username: string,
  nome: string,
  cognome: string,
  telefono: string,
  email: string,
  type: string
}

export interface StatsPellegrino {
  totViaggi: number,
  totKm: number,
  viaggioAttivo: boolean,
  luogoPartenza?: string,
  luogoArrivo?: string,
  dataPartenza?: string,
  dataArrivo?: string,
  oreAttivo?: number,
  kmAttivo?: number,
  idViaggioAttivo?: number
}

export interface StatsGestore {
  nStrutture: number,
  nPostiLetto?: number,
  totPrenotazioni?: number,
  futurePrenotazioni?: number
}

export interface Prenotazione {
  idStruttura: number,
  dataAlloggio: string,
  numLetti: number,
  usernamePellegrino: string
}

export interface PrenotazioneWithStruct extends Prenotazione {
  struttura: Struttura
}

export interface InfoPrenotazione {
  numLettiOccuppati: number;
  prenotazioni: Prenotazione[];
}

export interface Event {
  title: string, 
  date: string,
  backgroundColor: string
}

export interface Struttura {
  proprietario: string, 
  via: string,
  civico: number,
  colore: string,
  nome: string,
  id: number,
  nLetti: number,
  altreInfo?:string,
  url: string,
  viaLat: number,
  viaLon: number,
  idLuogo: number
}

export interface StructForm {
  nome: string,
  citta: string, // città è una stringa e sopra serve l'id del luogo, quindi non posso fare l'extend dell'interfaccia Struttura
  via: string,
  viaLat: number,
  viaLon: number,
  civico: number,
  nLetti: number,
  altreInfo: string,
  colore: string,
}

export interface StructWithProprietario extends Struttura{
  user: {nome: string, cognome: string, telefono: string}
}

export interface Via {
  name:string, 
  lat:number, 
  lng:number
}

export interface Luogo {
  id: number,
  nome: string
}

export interface Item {
  idItem: number,
  idCategoria: number,
  testo: string,
  checked: boolean
}

export interface  Categoria {
  idViaggio: number,
  idCategoria: number,
  nome: string,
  item: Item[],
  inputNewItem: string
}




export interface Viaggio {
  idViaggio: number,
  usernamePellegrino: string,
  idTappaPartenza: number,
  idTappaArrivo: number,
  dataPartenza: string,
  dataArrivo: string,
  nPersone: number,
  ordineInverso: boolean,
  maxOre: number
} 

export interface TappaViaggio {
  idViaggio: number,
  idTappa: number,
  partenza: Luogo,
  arrivo: Luogo,
  dataPercorrenza: string,
  nomeTappa: string,
  km: number,
  durata: number,
  gpx_url: string,
}

export interface TappaViaggioDb {
  idTappa: number,
  dataPercorrenza: string | null,
  nomeTappa: string
}

export interface Tappa {
  id: number,
  km: number,
  durata: number,
  luogo1: string,
  luogo2: string
}

export interface TimelineError {
  color: string,
  message: string
}

export interface PrenotazioneColor {
  color: "green" | "red" | "gray",
  luogo:string,
  prenotazione: PrenotazioneWithStruct | null | undefined
}

export type TipoModifica = 'date' | 'tappe' | '';

export interface NumLettiOccupati {
  dataAlloggio: string,
  idStruttura: number,
  totletti: number
}