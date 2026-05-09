import { Client, Databases, ID, Query, Functions } from "node-appwrite";

/**
 * Appwrite Function: create-booking
 * Handles booking creation with seat availability check and auto-bump logic.
 */
export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const functions = new Functions(client);

  const DB_ID = process.env.APPWRITE_DATABASE_ID;
  const BOOKINGS_ID = process.env.VITE_APPWRITE_COLLECTION_BOOKINGS;
  const SLOTS_ID = process.env.VITE_APPWRITE_COLLECTION_SHUTTLE_SLOTS;
  const RETURN_SLOTS_ID = process.env.VITE_APPWRITE_COLLECTION_RETURN_SLOTS;

  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { nome, email, telefono, tipo_viaggio, giorno, fermata, orario, orario_ritorno, event_id, testMode } = body;

    // Basic Validation
    if (!nome || !email || !telefono || !tipo_viaggio || !giorno) {
      return res.json({ error: "Missing required fields" }, 400);
    }

    const needsAndata = tipo_viaggio === "andata" || tipo_viaggio === "andata_ritorno";
    const needsRitorno = tipo_viaggio === "ritorno" || tipo_viaggio === "andata_ritorno";

    let finalOrario = orario;
    let andataBumped = false;

    // --- Validate Andata Availability ---
    if (needsAndata) {
      const queries = [
        Query.equal("giorno", giorno),
        Query.equal("fermata", fermata),
        Query.orderAsc("orario")
      ];
      if (event_id) queries.push(Query.equal("event_id", event_id));

      const slotsRes = await databases.listDocuments(DB_ID, SLOTS_ID, queries);
      const allDaySlots = slotsRes.documents.filter(s => !s.nascosto);

      if (allDaySlots.length === 0) {
        return res.json({ error: "No slots available for this day/stop" }, 400);
      }

      const validTimes = allDaySlots.map(s => s.orario);
      if (!orario || !validTimes.includes(orario)) {
        return res.json({ error: "Invalid departure time" }, 400);
      }

      // Check capacity
      const bQueries = [
        Query.equal("giorno", giorno),
        Query.equal("fermata", fermata),
        Query.equal("pagato", true),
        Query.limit(500)
      ];
      if (event_id) bQueries.push(Query.equal("event_id", event_id));
      const bookingsRes = await databases.listDocuments(DB_ID, BOOKINGS_ID, bQueries);
      
      const counts = {};
      bookingsRes.documents.forEach(b => {
        counts[b.orario] = (counts[b.orario] || 0) + 1;
      });

      const slotIdx = validTimes.indexOf(orario);
      const currentSlot = allDaySlots.find(s => s.orario === orario);
      
      if ((counts[orario] || 0) >= currentSlot.capienza) {
        let bumped = false;
        for (let i = slotIdx + 1; i < validTimes.length; i++) {
          const t = validTimes[i];
          const candidate = allDaySlots.find(s => s.orario === t);
          if ((counts[t] || 0) < candidate.capienza) {
            finalOrario = t;
            andataBumped = true;
            bumped = true;
            break;
          }
        }
        if (!bumped) return res.json({ error: "All departure slots are full" }, 400);
      }
    }

    // --- Validate Ritorno Availability ---
    let finalOrarioRitorno = orario_ritorno;
    let ritornoBumped = false;

    if (needsRitorno) {
      const rQueries = [Query.equal("giorno", giorno), Query.orderAsc("orario")];
      if (event_id) rQueries.push(Query.equal("event_id", event_id));

      const rSlotsRes = await databases.listDocuments(DB_ID, RETURN_SLOTS_ID, rQueries);
      const dbReturnSlots = rSlotsRes.documents.filter(s => !s.nascosto);

      if (dbReturnSlots.length === 0) {
        return res.json({ error: "No return slots available" }, 400);
      }

      const validReturnTimes = dbReturnSlots.map(s => s.orario);
      if (!orario_ritorno || !validReturnTimes.includes(orario_ritorno)) {
        return res.json({ error: "Invalid return time" }, 400);
      }

      const rbQueries = [
        Query.equal("giorno", giorno),
        Query.equal("pagato", true),
        Query.limit(500)
      ];
      if (event_id) rbQueries.push(Query.equal("event_id", event_id));
      const rBookingsRes = await databases.listDocuments(DB_ID, BOOKINGS_ID, rbQueries);

      const rCounts = {};
      rBookingsRes.documents.forEach(b => {
        if (b.orario_ritorno) rCounts[b.orario_ritorno] = (rCounts[b.orario_ritorno] || 0) + 1;
      });

      const returnIdx = validReturnTimes.indexOf(orario_ritorno);
      const currentRSlot = dbReturnSlots.find(s => s.orario === orario_ritorno);

      if ((rCounts[orario_ritorno] || 0) >= currentRSlot.capienza) {
        let bumped = false;
        for (let i = returnIdx + 1; i < validReturnTimes.length; i++) {
          const t = validReturnTimes[i];
          const candidate = dbReturnSlots.find(s => s.orario === t);
          if ((rCounts[t] || 0) < candidate.capienza) {
            finalOrarioRitorno = t;
            ritornoBumped = true;
            bumped = true;
            break;
          }
        }
        if (!bumped) return res.json({ error: "All return slots are full" }, 400);
      }
    }

    // --- Create Booking ---
    const bookingPayload = {
      nome, email, telefono, tipo_viaggio, giorno,
      fermata: needsAndata ? fermata : null,
      orario: needsAndata ? finalOrario : null,
      orario_ritorno: needsRitorno ? finalOrarioRitorno : null,
      event_id: event_id || null,
      stato: "pending",
      pagato: false,
      price_paid: body.price_paid || 0
    };

    const booking = await databases.createDocument(DB_ID, BOOKINGS_ID, ID.unique(), bookingPayload);

    // --- Trigger Email Function ---
    if (!testMode) {
      try {
        await functions.createExecution(
          process.env.APPWRITE_FUNCTION_EMAIL_ID, 
          JSON.stringify({ 
            nome, email, telefono, giorno,
            fermata: needsAndata ? fermata : null,
            orario_andata: needsAndata ? finalOrario : null,
            orario_ritorno: needsRitorno ? finalOrarioRitorno : null,
            confirmed: false,
            spostamento: andataBumped || ritornoBumped 
          })
        );
      } catch (err) {
        error("Failed to trigger email function: " + err.message);
      }
    }

    return res.json({
      success: true,
      bookingId: booking.$id,
      bumped: andataBumped || ritornoBumped,
      finalOrario,
      finalOrarioRitorno
    }, 200);

  } catch (err) {
    error("Error in create-booking: " + err.message);
    return res.json({ error: err.message }, 500);
  }
};
