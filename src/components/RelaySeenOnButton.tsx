import { Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { NostrEvent } from '@nostrify/nostrify';

interface RelaySeenOnButtonProps {
  event: NostrEvent;
  currentRelay?: string;
}

/**
 * Extracts relay URLs from an event's tags.
 * Looks for 'r' or 'relay' tags that contain relay URLs.
 */
function getRelaysFromEvent(event: NostrEvent, currentRelay?: string): string[] {
  const relays: Set<string> = new Set();

  // Add the current relay if provided (the relay we fetched this event from)
  if (currentRelay) {
    relays.add(currentRelay);
  }

  // Look for relay hints in tags
  for (const tag of event.tags) {
    const [tagType, value] = tag;

    // 'r' tags are commonly used for relay hints
    if (tagType === 'r' && value && value.startsWith('wss://')) {
      relays.add(value);
    }

    // Some events use 'relay' tag
    if (tagType === 'relay' && value && value.startsWith('wss://')) {
      relays.add(value);
    }
  }

  return Array.from(relays);
}

/**
 * Formats a relay URL for display by removing the protocol prefix.
 */
function formatRelayUrl(url: string): string {
  return url.replace(/^wss?:\/\//, '');
}

/**
 * A button that shows how many relays a note was seen on.
 * When clicked, shows a popover with the list of relay URLs.
 */
export function RelaySeenOnButton({ event, currentRelay }: RelaySeenOnButtonProps) {
  const relays = getRelaysFromEvent(event, currentRelay);

  // Don't render if no relays found
  if (relays.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <Server className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">{relays.length}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Seen on</h4>
          <div className="space-y-1">
            {relays.map((relay, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground py-1"
              >
                <Server className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{formatRelayUrl(relay)}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
