import { Booking, ShuttleSlot, ReturnSlot } from "@/interfaces/shuttle";

export const computeStats = (bookings: Booking[]) => {
  const totale = bookings.length;
  const pagati = bookings.filter((b) => b.pagato).length;
  const nonPagati = totale - pagati;
  const pagatiBookings = bookings.filter((b) => b.pagato);
  const incasso = pagatiBookings.reduce((sum, b) => sum + (Number(b.price_paid) || 0), 0).toFixed(2);
  const soloAndata = bookings.filter((b) => b.tipo_viaggio === "andata").length;
  const soloRitorno = bookings.filter((b) => b.tipo_viaggio === "ritorno").length;
  const andataRitorno = bookings.filter((b) => b.tipo_viaggio === "andata_ritorno").length;
  const oggi = new Date().toISOString().slice(0, 10);
  const iscrittiOggi = bookings.filter((b) => b.created_at?.slice(0, 10) === oggi).length;
  return { totale, pagati, nonPagati, incasso, soloAndata, soloRitorno, andataRitorno, iscrittiOggi };
};

export const computeSlotGroupMembers = (slots: ShuttleSlot[]) => {
  const map: Record<string, { fermata: string; orario: string }[]> = {};
  slots.forEach((s) => {
    if (!s.trip_group_id) return;
    if (!map[s.trip_group_id]) map[s.trip_group_id] = [];
    map[s.trip_group_id].push({ fermata: s.fermata, orario: s.orario });
  });
  return map;
};

export const computeSlotStats = (
  slots: ShuttleSlot[],
  bookings: Booking[],
  slotGroupMembers: Record<string, { fermata: string; orario: string }[]>
) => {
  return slots.map((slot) => {
    const members = slot.trip_group_id
      ? slotGroupMembers[slot.trip_group_id] || [{ fermata: slot.fermata, orario: slot.orario }]
      : [{ fermata: slot.fermata, orario: slot.orario }];
    const matches = (b: Booking) =>
      b.giorno === slot.giorno &&
      members.some((m) => m.fermata === b.fermata && m.orario === b.orario);
    const prenotati = bookings.filter(matches).length;
    const occupati = bookings.filter((b) => matches(b) && b.pagato).length;
    return { ...slot, prenotati, occupati, rimanenti: slot.capienza - occupati };
  });
};

export const computeReturnSlotStats = (returnSlots: ReturnSlot[], bookings: Booking[]) => {
  return returnSlots.map((slot) => {
    const matches = (b: Booking) =>
      b.giorno === slot.giorno &&
      b.orario_ritorno === slot.orario &&
      (b.tipo_viaggio === "ritorno" || b.tipo_viaggio === "andata_ritorno");
    const prenotati = bookings.filter(matches).length;
    const occupati = bookings.filter((b) => matches(b) && b.pagato).length;
    return { ...slot, prenotati, occupati, rimanenti: slot.capienza - occupati };
  });
};
