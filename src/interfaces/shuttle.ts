export type TipoViaggio = "andata" | "ritorno" | "andata_ritorno";

export interface Booking {
  id: string;
  nome: string;
  email: string;
  telefono: string;
  tipo_viaggio: string;
  giorno: string;
  fermata: string;
  orario: string;
  orario_ritorno: string;
  stato: string;
  pagato: boolean;
  event_id?: string;
  price_paid: number;
  created_at: string;
}

export interface ShuttleSlot {
  id: string;
  giorno: string;
  fermata: string;
  orario: string;
  capienza: number;
  trip_group_id?: string | null;
  event_id?: string;
  price_override?: number;
  nascosto?: boolean;
}

export interface ReturnSlot {
  id: string;
  giorno: string;
  orario: string;
  capienza: number;
  event_id?: string;
  price_override?: number;
  nascosto?: boolean;
}
