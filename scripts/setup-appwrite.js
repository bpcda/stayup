import { Client, Databases, Storage, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing Appwrite configuration. Please check your .env file.");
  console.error("Required: VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT, APPWRITE_API_KEY");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

async function setup() {
  try {
    console.log("1. Creating Database...");
    const db = await databases.create(ID.unique(), 'StayUp_DB');
    const dbId = db.$id;
    console.log(`Database created! ID: ${dbId}`);
    console.log(`Please add this to your .env file: VITE_APPWRITE_DATABASE_ID=${dbId}\n`);

    console.log("2. Creating Bookings Collection...");
    const bookings = await databases.createCollection(dbId, ID.unique(), 'bookings');
    const bookingsId = bookings.$id;
    console.log(`Bookings Collection created! ID: ${bookingsId}`);
    
    // Add attributes to Bookings
    await databases.createStringAttribute(dbId, bookingsId, 'nome', 255, true);
    await databases.createStringAttribute(dbId, bookingsId, 'email', 255, true);
    await databases.createStringAttribute(dbId, bookingsId, 'telefono', 50, true);
    await databases.createStringAttribute(dbId, bookingsId, 'tipo_viaggio', 50, true);
    await databases.createStringAttribute(dbId, bookingsId, 'giorno', 50, false);
    await databases.createStringAttribute(dbId, bookingsId, 'fermata', 100, false);
    await databases.createStringAttribute(dbId, bookingsId, 'orario', 50, false);
    await databases.createStringAttribute(dbId, bookingsId, 'orario_ritorno', 50, false);
    await databases.createStringAttribute(dbId, bookingsId, 'stato', 50, false, 'pending');
    await databases.createBooleanAttribute(dbId, bookingsId, 'pagato', false, false, false);
    await databases.createStringAttribute(dbId, bookingsId, 'event_id', 50, false);
    await databases.createFloatAttribute(dbId, bookingsId, 'price_paid', false, 0);
    await databases.createDatetimeAttribute(dbId, bookingsId, 'created_at', false);
    
    console.log("3. Creating Shuttle Slots Collection...");
    const shuttleSlots = await databases.createCollection(dbId, ID.unique(), 'shuttle_slots');
    const shuttleSlotsId = shuttleSlots.$id;
    console.log(`Shuttle Slots Collection created! ID: ${shuttleSlotsId}`);

    await databases.createStringAttribute(dbId, shuttleSlotsId, 'giorno', 50, true);
    await databases.createStringAttribute(dbId, shuttleSlotsId, 'fermata', 100, true);
    await databases.createStringAttribute(dbId, shuttleSlotsId, 'orario', 50, true);
    await databases.createIntegerAttribute(dbId, shuttleSlotsId, 'capienza', true);
    await databases.createStringAttribute(dbId, shuttleSlotsId, 'trip_group_id', 100, false);
    await databases.createBooleanAttribute(dbId, shuttleSlotsId, 'nascosto', false, false, false);
    await databases.createStringAttribute(dbId, shuttleSlotsId, 'event_id', 50, true);
    await databases.createFloatAttribute(dbId, shuttleSlotsId, 'price_override', false);

    console.log("4. Creating Return Slots Collection...");
    const returnSlots = await databases.createCollection(dbId, ID.unique(), 'shuttle_return_slots');
    const returnSlotsId = returnSlots.$id;
    console.log(`Return Slots Collection created! ID: ${returnSlotsId}`);

    await databases.createStringAttribute(dbId, returnSlotsId, 'giorno', 50, true);
    await databases.createStringAttribute(dbId, returnSlotsId, 'orario', 50, true);
    await databases.createIntegerAttribute(dbId, returnSlotsId, 'capienza', true);
    await databases.createBooleanAttribute(dbId, returnSlotsId, 'nascosto', false, false, false);
    await databases.createStringAttribute(dbId, returnSlotsId, 'event_id', 50, true);
    await databases.createFloatAttribute(dbId, returnSlotsId, 'price_override', false);

    console.log("5. Creating Events Collection...");
    const events = await databases.createCollection(dbId, ID.unique(), 'events');
    const eventsId = events.$id;
    console.log(`Events Collection created! ID: ${eventsId}`);

    await databases.createStringAttribute(dbId, eventsId, 'title', 255, true);
    await databases.createStringAttribute(dbId, eventsId, 'slug', 255, false);
    await databases.createStringAttribute(dbId, eventsId, 'description', 2000, false);
    await databases.createStringAttribute(dbId, eventsId, 'location', 255, false);
    await databases.createDatetimeAttribute(dbId, eventsId, 'starts_at', false);
    await databases.createDatetimeAttribute(dbId, eventsId, 'ends_at', false);
    await databases.createBooleanAttribute(dbId, eventsId, 'is_active', false, false, true);
    await databases.createBooleanAttribute(dbId, eventsId, 'is_public', false, false, true);
    await databases.createBooleanAttribute(dbId, eventsId, 'has_shuttle', false, false, false);
    await databases.createFloatAttribute(dbId, eventsId, 'price_one_way', false, 0);
    await databases.createFloatAttribute(dbId, eventsId, 'price_round_trip', false, 0);
    await databases.createStringAttribute(dbId, eventsId, 'cover_image_url', 500, false);

    console.log("6. Creating Storage Bucket for Event Covers...");
    const bucket = await storage.createBucket(ID.unique(), 'event-covers');
    const bucketId = bucket.$id;
    console.log(`Storage Bucket created! ID: ${bucketId}`);

    console.log("7. Creating Event Participations Collection...");
    const participations = await databases.createCollection(dbId, ID.unique(), 'event_participations');
    const participationsId = participations.$id;
    console.log(`Event Participations Collection created! ID: ${participationsId}`);

    await databases.createStringAttribute(dbId, participationsId, 'event_id', 50, true);
    await databases.createStringAttribute(dbId, participationsId, 'user_id', 50, true);
    await databases.createStringAttribute(dbId, participationsId, 'status', 50, false, 'registered');

    console.log("\n--- ENVIRONMENT VARIABLES TO ADD ---");
    console.log(`VITE_APPWRITE_DATABASE_ID=${dbId}`);
    console.log(`VITE_APPWRITE_COLLECTION_BOOKINGS=${bookingsId}`);
    console.log(`VITE_APPWRITE_COLLECTION_SHUTTLE_SLOTS=${shuttleSlotsId}`);
    console.log(`VITE_APPWRITE_COLLECTION_RETURN_SLOTS=${returnSlotsId}`);
    console.log(`VITE_APPWRITE_COLLECTION_EVENTS=${eventsId}`);
    console.log(`VITE_APPWRITE_BUCKET_EVENTS=${bucketId}`);
    console.log(`VITE_APPWRITE_COLLECTION_EVENT_PARTICIPATIONS=${participationsId}`);
    
    console.log("\n✅ Setup complete! Please add the above variables to your .env file.");

  } catch (err) {
    console.error("Error setting up Appwrite:", err);
  }
}

setup();
