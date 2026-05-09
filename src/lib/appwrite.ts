import { Client, Account, Databases, Functions, Storage } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || '';
const APPWRITE_PROJECT = import.meta.env.VITE_APPWRITE_PROJECT || '';

export const isAppwriteConfigured = !!(APPWRITE_ENDPOINT && APPWRITE_PROJECT);

if (!isAppwriteConfigured) {
  console.warn("Appwrite non configurato — le funzionalità di autenticazione potrebbero non funzionare");
}

export const client = new Client();

if (isAppwriteConfigured) {
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);

