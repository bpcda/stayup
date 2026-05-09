import { Client, Users } from "node-appwrite";

/**
 * Appwrite Function: delete-account
 * Deletes the currently authenticated user's account.
 */
export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); // Must have 'users.write' scope

  const users = new Users(client);

  // Appwrite injects the user ID into the headers if executed via Client SDK by an authenticated user
  const userId = req.headers['x-appwrite-user-id'];

  if (!userId) {
    error("Missing user ID. Ensure the function is executed by an authenticated user.");
    return res.json({ error: "Unauthorized" }, 401);
  }

  try {
    log(`Attempting to delete account for user: ${userId}`);
    
    await users.delete(userId);
    
    log(`Successfully deleted account: ${userId}`);
    return res.json({ success: true }, 200);
  } catch (err) {
    error("Error deleting account: " + err.message);
    return res.json({ error: err.message }, 500);
  }
};
