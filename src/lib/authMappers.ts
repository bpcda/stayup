import { User, Session } from "@supabase/supabase-js";
import { Models } from "appwrite";
import { UserPrefs } from "@/interfaces/auth";

export const mapAppwriteUserToSupabaseUser = (appwriteUser: Models.User<Models.Preferences>): User => {
  const prefs = appwriteUser.prefs as UserPrefs;
  
  return {
    id: appwriteUser.$id,
    app_metadata: {},
    user_metadata: {
      first_name: prefs?.firstName || appwriteUser.name?.split(' ')[0] || '',
      last_name: prefs?.lastName || appwriteUser.name?.split(' ').slice(1).join(' ') || '',
      phone: prefs?.phone || '',
      city: prefs?.city || '',
    },
    aud: 'authenticated',
    created_at: appwriteUser.$createdAt,
    email: appwriteUser.email,
    phone: appwriteUser.phone,
    updated_at: appwriteUser.$updatedAt,
    role: 'authenticated',
    factors: [],
  } as unknown as User;
};

export const mapAppwriteSessionToSupabaseSession = (appwriteSession: Models.Session, user: User): Session => {
  return {
    access_token: appwriteSession.$id,
    refresh_token: '',
    expires_in: 0,
    expires_at: new Date(appwriteSession.expire).getTime() / 1000,
    token_type: 'bearer',
    user: user,
  };
};
