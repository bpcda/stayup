import { Booking, ShuttleSlot, ReturnSlot, SlotGroupMembers } from "@/interfaces/shuttle";

export const STOPS = ["Università Cattolica", "Cheope"];
export const GIORNI = ["25 Aprile", "26 Aprile"];

const downloadCsv = (filename: string, rows: Record<string, string | number | null | undefined>[]) => {
  const headers = Object.keys(rows[0] ?? { "N.": "" });
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers
      .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
      .join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadPassengerList = (
  slot: ShuttleSlot,
  bookings: Booking[],
  slotGroupMembers: SlotGroupMembers
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
  downloadCsv(`andata_${slot.giorno.replace(/\s/g, "_")}_${slot.fermata.replace(/\s/g, "_")}_${slot.orario}.csv`, data);
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
  downloadCsv(`ritorno_${slot.giorno.replace(/\s/g, "_")}_${slot.orario.replace(":", "")}.csv`, data);
};
