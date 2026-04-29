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
  created_at: string;
}

export interface ShuttleSlot {
  id: string;
  giorno: string;
  fermata: string;
  orario: string;
  capienza: number;
  trip_group_id: string | null;
}

export interface ReturnSlot {
  id: string;
  giorno: string;
  orario: string;
  capienza: number;
}