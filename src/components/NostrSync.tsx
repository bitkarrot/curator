import { useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * NostrSync - Syncs user's Nostr data
 *
 * This component runs globally to sync various Nostr data when the user logs in.
 * Currently syncs:
 * - NIP-65 relay list (kind 10002)
 */
export function NostrSync() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, updateConfig } = useAppContext();

  useEffect(() => {
    if (!user) return;

    const syncRelaysFromNostr = async () => {
      try {
        const events = await nostr.query(
          [{ kinds: [10002], authors: [user.pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(5000) }
        );

        if (events.length > 0) {
          const event = events[0];

          // Only update if the event is newer than our stored data
          if (event.created_at > config.relayMetadata.updatedAt) {
            const fetchedRelays = event.tags
              .filter(([name]) => name === 'r')
              .map(([_, url, marker]) => ({
                url,
                read: !marker || marker === 'read',
                write: !marker || marker === 'write',
              }));

            // Ensure swarm.hivetalk.org is always the primary relay
            const defaultRelay = { url: 'wss://swarm.hivetalk.org', read: true, write: true };
            const otherRelays = fetchedRelays.filter(r => r.url !== 'wss://swarm.hivetalk.org');
            const finalRelays = [defaultRelay, ...otherRelays];
            
            console.log('Syncing relay list from Nostr with swarm.hivetalk.org as primary:', finalRelays);
            
            updateConfig((current) => ({
              ...current,
              relayMetadata: {
                relays: finalRelays,
                updatedAt: event.created_at,
              },
            }));
          }
        } else {
          // No relay list found, ensure we have the default relay
          console.log('No relay list found in Nostr, ensuring default relay is set');
          if (!config.relayMetadata.relays.some(r => r.url === 'wss://swarm.hivetalk.org')) {
            const defaultRelay = { url: 'wss://swarm.hivetalk.org', read: true, write: true };
            updateConfig((current) => ({
              ...current,
              relayMetadata: {
                relays: [defaultRelay, ...(current.relayMetadata?.relays || [])],
                updatedAt: current.relayMetadata?.updatedAt || 0,
              },
            }));
          }
        }
      } catch (error) {
        console.error('Failed to sync relays from Nostr:', error);
      }
    };

    syncRelaysFromNostr();
  }, [user, config.relayMetadata.updatedAt, config.relayMetadata.relays, nostr, updateConfig]);

  return null;
}