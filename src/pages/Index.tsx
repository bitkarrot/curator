import { useSeoMeta } from '@unhead/react';
import { useState, useEffect, useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAppContext } from '@/hooks/useAppContext';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthorDisplay } from '@/components/AuthorDisplay';
import { PublishModeToggle } from '@/components/PublishModeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Eye, Trash2, RefreshCw, Github } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

const Index = () => {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { config } = useAppContext();
  const { toast } = useToast();

  // Debug user object
  useEffect(() => {
    console.log('Current user:', user);
    console.log('User pubkey:', user?.pubkey);
  }, [user]);

  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<string>('1');
  const [searchKind, setSearchKind] = useState<string>('1');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(new Set());
  
  const currentRelay = config.relayMetadata.relays[0]?.url || 'wss://swarm.hivetalk.org';
  const [limit] = useState(50);
  const [until, setUntil] = useState<number | undefined>(undefined);

  useSeoMeta({
    title: 'Curator',
    description: 'A Nostr client for viewing and interacting with relay content.',
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
  }, [currentRelay, kindFilter, limit, until, nostr, toast, deletedEventIds]);

  const handleSearch = () => {
    setKindFilter(searchKind);
    setUntil(undefined);
  };

  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;

    publishEvent({
      kind: 1,
      content: newNoteContent,
      tags: [],
    }, {
      onSuccess: () => {
        setNewNoteContent('');
        setShowCreateDialog(false);
        toast({
          title: 'Success',
          description: 'Note published successfully!',
        });
        // Refresh events
        loadEvents();
      },
      onError: (_error) => {
        toast({
          title: 'Error',
          description: 'Failed to publish note',
          variant: 'destructive',
        });
      },
    });
  };

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
  }, [kindFilter, currentRelay]); // Intentionally omitting loadEvents to prevent circular dependency

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold truncate">
            <Search
              className="h-7 w-7 dark:text-accent text-primary flex-shrink-0"
              strokeWidth={3.5}
            />
              <span className="truncate dark:text-primary"> Curator.hivetalk.org</span>
            </h1>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Login Area */}
              <LoginArea />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search Section */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
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

            {/* Create Note Button */}
            {user && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="flex-1 sm:flex-none">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-4 max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Kind 1 Note</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={4}
                    />
                    <PublishModeToggle />
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button onClick={handleCreateNote} disabled={isPublishing || !newNoteContent.trim()} className="w-full sm:w-auto">
                        {isPublishing ? 'Publishing...' : 'Publish'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">from relay:</span>
            <Badge variant="secondary" className="truncate max-w-[200px] sm:max-w-none text-base font-semibold px-3 py-1">{currentRelay}</Badge>
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
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <AuthorDisplay pubkey={event.pubkey} size="sm" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <Badge variant="outline">Kind {event.kind}</Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="mx-4 max-w-2xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Raw Event Data</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <pre className="bg-muted p-2 sm:p-4 rounded-md text-xs overflow-auto max-h-[60vh]">
                                {JSON.stringify(event, null, 2)}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {/* Delete button - only show for user's own events */}
                        {(() => {
                          const canDelete = user && event.pubkey === user.pubkey;
                          // if (user) {
                          //   console.log(`Event ${event.id.substring(0, 8)}... - User: ${user.pubkey.substring(0, 8)}..., Event: ${event.pubkey.substring(0, 8)}..., Can delete: ${canDelete}`);
                          // }
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
                    <p className="text-sm whitespace-pre-wrap">
                      {truncateContent(event.content)}
                    </p>
                    {event.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {event.tags.slice(0, 5).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag[0]}: {tag[1]?.substring(0, 20)}
                            {tag[1]?.length > 20 ? '...' : ''}
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

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <span>Curator - A Nostr Relay Kind Viewer</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-primary">
              <a href="https://hivetalk.org">
              Hivetalk</a></span>
            <span className="text-muted-foreground">•</span>
            <a
              href="https://github.com/bitkarrot/curator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Github className="h-4 w-4" />
              <span>GitHub Source</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

