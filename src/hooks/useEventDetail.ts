import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { databases, isAppwriteConfigured } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { EventRow } from "@/interfaces/events";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
const EVENTS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_EVENTS || '';
const PARTICIPATIONS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_EVENT_PARTICIPATIONS || '';

export const useEventDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug || !isAppwriteConfigured || !DB_ID) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      try {
        const res = await databases.listDocuments(DB_ID, EVENTS_ID, [Query.equal("slug", slug)]);
        if (res.total === 0) { setEvent(null); setLoading(false); return; }

        const doc = res.documents[0];
        const eventData = { ...doc, id: doc.$id } as any as EventRow;
        setEvent(eventData);

        if (user) {
          const partRes = await databases.listDocuments(DB_ID, PARTICIPATIONS_ID, [
            Query.equal("event_id", eventData.id),
            Query.equal("user_id", user.id)
          ]);
          setRegistered(partRes.total > 0);
        }
      } catch (err: any) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, [slug, user]);

  const register = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!event || !DB_ID) return;
    setBusy(true);
    try {
      await databases.createDocument(DB_ID, PARTICIPATIONS_ID, ID.unique(), {
        event_id: event.id,
        user_id: user.id,
        status: "registered"
      });
      toast({ title: "Iscrizione confermata" });
      setRegistered(true);
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setBusy(false);
  };

  const unregister = async () => {
    if (!user || !event || !DB_ID) return;
    setBusy(true);
    try {
      const partRes = await databases.listDocuments(DB_ID, PARTICIPATIONS_ID, [
        Query.equal("event_id", event.id),
        Query.equal("user_id", user.id)
      ]);
      if (partRes.total > 0) {
        await databases.deleteDocument(DB_ID, PARTICIPATIONS_ID, partRes.documents[0].$id);
        toast({ title: "Iscrizione annullata" });
        setRegistered(false);
      }
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setBusy(false);
  };

  const isPast = useMemo(() => (event?.starts_at ? new Date(event.starts_at).getTime() < Date.now() : false), [event?.starts_at]);

  return { event, loading, registered, busy, register, unregister, isPast };
};
