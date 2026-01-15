import { useSeoMeta } from '@unhead/react';
import { useState, useEffect, useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAppContext } from '@/hooks/useAppContext';
import { Navigation } from '@/components/Navigation';
import { AuthorDisplay } from '@/components/AuthorDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Trash2, RefreshCw, Check, ChevronsUpDown, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { RelaySelector } from '@/components/RelaySelector';
import { NoteDetailDialog } from '@/components/NoteDetailDialog';
import { RelaySeenOnButton } from '@/components/RelaySeenOnButton';

import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

const SearchPage = () => {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { config } = useAppContext();
  const { toast } = useToast();

  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<string>('1');
  const [searchKind, setSearchKind] = useState<string>('1');
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<NostrEvent | null>(null);

  // Author filtering state
  // Author filtering state
  const [selectedFeedAuthors, setSelectedFeedAuthors] = useState<Set<string>>(new Set());
  const [openAuthorSelect, setOpenAuthorSelect] = useState(false);

  const currentRelay = config.relayMetadata.relays[0]?.url || 'wss://swarm.hivetalk.org';
  const [limit] = useState(50);
  const [until, setUntil] = useState<number | undefined>(undefined);

  useSeoMeta({
    title: 'Search - Curator',
    description: 'Search and browse Nostr events by kind.',
  });

  const loadEvents = useCallback(async (loadMore = false) => {
    if (!currentRelay) return;

    setLoading(true);
    try {
      // Query both target events AND kind 5 deletion events (simplified, no caching)
      const filters = [
        {
          kinds: [parseInt(kindFilter)],
          limit,
          ...(selectedFeedAuthors.size > 0 ? { authors: Array.from(selectedFeedAuthors) } : {}),
          ...(loadMore && until ? { until } : {}),
        },
        {
          kinds: [5], // Query deletion events
          limit: 50, // Limited to last 50
        }
      ];

      const eventIterator = nostr.req(filters, { relays: [currentRelay] });
      const newEvents: NostrEvent[] = [];
      const deletionEvents: NostrEvent[] = [];

      for await (const msg of eventIterator) {
        if (msg[0] === 'EVENT') {
          const event = msg[2];
          if (event.kind === 5) {
            deletionEvents.push(event);
            // If we're specifically searching for Kind 5, also add to newEvents for display
            if (parseInt(kindFilter) === 5) {
              newEvents.push(event);
            }
          } else {
            newEvents.push(event);
          }
        }
        if (msg[0] === 'EOSE') {
          break;
        }
      }

      // Build set of deleted event IDs from kind 5 events
      const relayDeletedEventIds = new Set<string>();
      deletionEvents.forEach(deleteEvent => {
        deleteEvent.tags.forEach(tag => {
          if (tag[0] === 'e' && tag[1]) {
            relayDeletedEventIds.add(tag[1]);
          }
        });
      });

      if (deletionEvents.length > 0) {
        console.log(`Found ${deletionEvents.length} deletion events on relay: ${currentRelay}`);
      }

      // Sort by created_at descending
      newEvents.sort((a, b) => b.created_at - a.created_at);

      // Filter out deleted events ONLY if we're not searching for Kind 5 events
      const filteredEvents = parseInt(kindFilter) === 5
        ? newEvents // Don't filter Kind 5 events when specifically searching for them
        : newEvents.filter(event =>
          !deletedEventIds.has(event.id) && !relayDeletedEventIds.has(event.id)
        );

      const filteredCount = newEvents.length - filteredEvents.length;
      if (filteredCount > 0) {
        console.log(`Filtered out ${filteredCount} deleted events`);
      }

      // Update deleted events (no persistence to localStorage)
      if (relayDeletedEventIds.size > 0) {
        setDeletedEventIds(relayDeletedEventIds);
      }

      if (loadMore) {
        setEvents(prev => [...prev, ...filteredEvents]);
      } else {
        setEvents(filteredEvents);
      }

      if (newEvents.length > 0) {
        setUntil(newEvents[newEvents.length - 1].created_at);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events from relay',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentRelay, kindFilter, limit, until, nostr, toast, deletedEventIds, selectedFeedAuthors]);

  const handleSearch = () => {
    setKindFilter(searchKind);
    setUntil(undefined);
    setEvents([]);
  };

  // Derive unique authors from current events for the dropdown
  const availableAuthors = events.reduce((acc, event) => {
    if (!acc.has(event.pubkey)) {
      acc.set(event.pubkey, {
        pubkey: event.pubkey,
        // We could look up profile metadata here if we had it, for now just use pubkey
        display: nip19.npubEncode(event.pubkey).substring(0, 12) + '...'
      });
    }
    return acc;
  }, new Map<string, { pubkey: string, display: string }>());

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) {
      console.error('No user logged in');
      return;
    }

    console.log('=== DELETE EVENT PROCESS ===');
    console.log('Event ID to delete:', eventId);
    console.log('User pubkey:', user.pubkey);
    console.log('User signer available:', !!user.signer);

    const deleteEventData = {
      kind: 5,
      content: 'Deleted',
      tags: [['e', eventId]],
    };
    console.log('Delete event data:', deleteEventData);

    try {
      publishEvent(deleteEventData, {
        onSuccess: async (signedEvent) => {
          console.log('✅ Delete event signed and published successfully:', signedEvent);
          console.log('Signed event ID:', signedEvent.id);
          console.log('Signed event pubkey:', signedEvent.pubkey);
          console.log('Signed event signature:', signedEvent.sig);

          // Verify that the relay actually accepted the deletion event
          try {
            console.log('🔍 Verifying deletion event was accepted by relay...');
            const verificationIterator = nostr.req([{
              kinds: [5],
              ids: [signedEvent.id],
              limit: 1
            }], { relays: [currentRelay] });

            let deletionEventFound = false;
            for await (const msg of verificationIterator) {
              if (msg[0] === 'EVENT' && msg[2].id === signedEvent.id) {
                deletionEventFound = true;
                console.log('✅ Deletion event confirmed on relay:', msg[2]);
                break;
              }
              if (msg[0] === 'EOSE') {
                break;
              }
            }

            if (deletionEventFound) {
              console.log('✅ Relay accepted the deletion event');
              toast({
                title: 'Success',
                description: 'Event deleted! Deletion confirmed by relay.',
              });
            } else {
              console.warn('⚠️ Deletion event not found on relay - may have been rejected');
              toast({
                title: 'Warning',
                description: 'Deletion sent but not confirmed by relay. Event hidden locally only.',
                variant: 'destructive',
              });
            }
          } catch (verificationError) {
            console.error('❌ Failed to verify deletion on relay:', verificationError);
            toast({
              title: 'Warning',
              description: 'Deletion sent but verification failed. Event hidden locally.',
            });
          }

          // Track deleted event ID (session only, no localStorage)
          setDeletedEventIds(prev => {
            const newSet = new Set([...prev, eventId]);
            console.log(`Added event ${eventId} to deleted list. Total deleted: ${newSet.size}`);
            return newSet;
          });

          // Remove the event from local state immediately for better UX
          setEvents(prevEvents => {
            const filtered = prevEvents.filter(e => e.id !== eventId);
            console.log(`Removed event from local state. Events before: ${prevEvents.length}, after: ${filtered.length}`);
            return filtered;
          });
        },
        onError: (error) => {
          console.error('❌ Delete error:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          toast({
            title: 'Error',
            description: `Failed to send deletion request: ${error.message}`,
            variant: 'destructive',
          });
        },
      });
    } catch (error) {
      console.error('❌ Failed to delete event (outer catch):', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, currentRelay, selectedFeedAuthors]); // Auto-refresh when filters change

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        {/* Search Section */}
        <div className="mb-6">
          <div className="flex flex-col gap-6">
            {/* Top Row: Kind Search & Actions */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Search by Kind Number</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="number"
                    placeholder="Enter kind number (e.g., 1)"
                    value={searchKind}
                    onChange={(e) => setSearchKind(e.target.value)}
                    className="w-full sm:max-w-xs border-2 border-primary focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSearch} disabled={loading} className="flex-1 sm:flex-none">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                    <Button onClick={() => loadEvents()} disabled={loading} variant="outline" className="border-2 border-primary flex-1 sm:flex-none">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Author Filter Section */}
            <Card>
              <CardContent className="py-3 px-4 space-y-4">




                {/* Feed Author Selector */}
                <div className="space-y-2">
                  <Label>Select from Feed Authors</Label>
                  <Popover open={openAuthorSelect} onOpenChange={setOpenAuthorSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openAuthorSelect}
                        className="w-full justify-between"
                      >
                        {selectedFeedAuthors.size > 0
                          ? `${selectedFeedAuthors.size} authors selected`
                          : "Select authors from current feed..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search authors..." />
                        <CommandList>
                          <CommandEmpty>No authors found in current view.</CommandEmpty>
                          <CommandGroup>
                            {Array.from(availableAuthors.values()).map((author) => (
                              <CommandItem
                                key={author.pubkey}
                                value={author.pubkey}
                                onSelect={(currentValue) => {
                                  setSelectedFeedAuthors(prev => {
                                    const next = new Set(prev);
                                    if (next.has(currentValue)) {
                                      next.delete(currentValue);
                                    } else {
                                      next.add(currentValue);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                <div className="flex items-center gap-2 w-full overflow-hidden">
                                  <Check
                                    className={cn(
                                      "h-4 w-4 shrink-0",
                                      selectedFeedAuthors.has(author.pubkey) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <AuthorDisplay pubkey={author.pubkey} size="sm" showLink={false} className="flex-1" />
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Selected Tags Display */}
                  {selectedFeedAuthors.size > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Array.from(selectedFeedAuthors).map(pubkey => (
                        <Badge key={pubkey} variant="secondary" className="pl-2 pr-1 py-1 flex items-center">
                          <div className="flex items-center gap-1 max-w-[150px]">
                            <AuthorDisplay pubkey={pubkey} size="sm" showLink={false} />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 rounded-full hover:bg-destructive/20"
                            onClick={() => setSelectedFeedAuthors(prev => {
                              const next = new Set(prev);
                              next.delete(pubkey);
                              return next;
                            })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Current Filter Info */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Showing</span>
            <Badge variant="default">{events.length}</Badge>
            <span className="text-sm text-muted-foreground">
              {events.length >= limit ? `of ${limit}+ events` : 'events'} of kind:
            </span>
            <Badge variant="secondary">{kindFilter}</Badge>
            {selectedFeedAuthors.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground ml-2">filtered by:</span>
                <Badge variant="secondary">{selectedFeedAuthors.size} authors</Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">from relay:</span>
            <RelaySelector className="h-auto py-1 px-2 sm:px-3 rounded-full border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs sm:text-base font-semibold max-w-[200px] sm:max-w-[350px]" />
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {loading && events.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No events found for kind {kindFilter}</p>
            </div>
          ) : (
            <>
              {events.map((event) => (
                <Card
                  key={event.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <AuthorDisplay pubkey={event.pubkey} size="sm" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline">Kind {event.kind}</Badge>
                        <RelaySeenOnButton event={event} currentRelay={currentRelay} />
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View raw JSON"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="mx-2 sm:mx-4 w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-hidden">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Raw Event Data</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 overflow-hidden">
                              <pre className="bg-muted p-2 sm:p-4 rounded-md text-xs overflow-auto max-h-[65vh] whitespace-pre-wrap break-all">
                                {JSON.stringify(event, null, 2)}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Delete button - only show for user's own events */}
                        {(() => {
                          const canDelete = user && event.pubkey === user.pubkey;
                          return canDelete;
                        })() && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this event? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEvent(event.id)}
                                    disabled={isPublishing}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {isPublishing ? 'Deleting...' : 'Yes, Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {truncateContent(event.content)}
                    </p>
                    {event.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {event.tags.slice(0, 5).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs break-all">
                            {tag[0]}: {tag[1]?.substring(0, 15)}
                            {tag[1]?.length > 15 ? '...' : ''}
                          </Badge>
                        ))}
                        {event.tags.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{event.tags.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Note Detail Dialog */}
              <NoteDetailDialog
                event={selectedEvent}
                open={selectedEvent !== null}
                onOpenChange={(open) => !open && setSelectedEvent(null)}
                currentRelay={currentRelay}
              />

              {/* Load More Button */}
              {events.length >= limit && (
                <div className="text-center py-4">
                  <Button
                    onClick={() => loadEvents(true)}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
