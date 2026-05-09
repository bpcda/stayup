import * as XLSX from "xlsx";
import { Booking, ShuttleSlot, ReturnSlot } from "@/interfaces/shuttle";

export const STOPS = ["Università Cattolica", "Cheope"];
export const GIORNI = ["25 Aprile", "26 Aprile"];

export const downloadPassengerList = (
  slot: ShuttleSlot,
  bookings: Booking[],
  slotGroupMembers: Record<string, { fermata: string; orario: string }[]>
) => {
  const members = slot.trip_group_id
    ? slotGroupMembers[slot.trip_group_id] || [{ fermata: slot.fermata, orario: slot.orario }]
    : [{ fermata: slot.fermata, orario: slot.orario }];
  const passengers = bookings.filter(
    (b) => b.giorno === slot.giorno && b.pagato && members.some((m) => m.fermata === b.fermata && m.orario === b.orario)
  );
  const data = passengers.map((p, i) => ({
    "N.": i + 1, Nome: p.nome, Telefono: p.telefono, Email: p.email, Fermata: p.fermata, Orario: p.orario,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 30 }, { wch: 22 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Passeggeri");
  XLSX.writeFile(wb, `andata_${slot.giorno.replace(/\s/g, "_")}_${slot.fermata.replace(/\s/g, "_")}_${slot.orario}.xlsx`);
};

export const downloadReturnPassengerList = (
  slot: ReturnSlot,
  bookings: Booking[]
) => {
  const passengers = bookings.filter(
    (b) =>
      b.giorno === slot.giorno &&
      b.orario_ritorno === slot.orario &&
      (b.tipo_viaggio === "ritorno" || b.tipo_viaggio === "andata_ritorno") &&
      b.pagato
  );
  const data = passengers.map((p, i) => ({ "N.": i + 1, Nome: p.nome, Telefono: p.telefono, Email: p.email }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Passeggeri");
  XLSX.writeFile(wb, `ritorno_${slot.giorno.replace(/\s/g, "_")}_${slot.orario.replace(":", "")}.xlsx`);
};
