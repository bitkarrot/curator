import { useSeoMeta } from '@unhead/react';
import { useState, useEffect, useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthorDisplay } from '@/components/AuthorDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Sun, Search, Plus, Eye, Trash2, Settings, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

const Index = () => {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useAppContext();
  const { toast } = useToast();

  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<string>('1');
  const [searchKind, setSearchKind] = useState<string>('1');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRelayDialog, setShowRelayDialog] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [currentRelay, setCurrentRelay] = useState(config.relayMetadata.relays[0]?.url || 'wss://swarm.hivetalk.org');
  const [limit] = useState(50);
  const [until, setUntil] = useState<number | undefined>(undefined);

  useSeoMeta({
    title: 'Nostr Relay Viewer',
    description: 'A Nostr client for viewing and interacting with relay content.',
  });

  const loadEvents = useCallback(async (loadMore = false) => {
    if (!currentRelay) return;
    
    setLoading(true);
    try {
      const filter = {
        kinds: [parseInt(kindFilter)],
        limit,
        ...(loadMore && until ? { until } : {}),
      };

      const eventIterator = nostr.req([filter], { relays: [currentRelay] });
      const newEvents: NostrEvent[] = [];
      
      for await (const msg of eventIterator) {
        if (msg[0] === 'EVENT') {
          newEvents.push(msg[2]);
        }
        if (msg[0] === 'EOSE') {
          break;
        }
      }

      // Sort by created_at descending
      newEvents.sort((a, b) => b.created_at - a.created_at);

      if (loadMore) {
        setEvents(prev => [...prev, ...newEvents]);
      } else {
        setEvents(newEvents);
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
  }, [currentRelay, kindFilter, limit, until, nostr, toast]);

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
    if (!user) return;

    try {
      publishEvent({
        kind: 5,
        content: 'Deleted',
        tags: [['e', eventId]],
      }, {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Event deleted successfully!',
          });
          loadEvents();
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to delete event',
            variant: 'destructive',
          });
        },
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const addRelay = () => {
    if (!newRelayUrl.trim()) return;
    
    const relayUrl = newRelayUrl.trim();
    if (!relayUrl.startsWith('wss://') && !relayUrl.startsWith('ws://')) {
      toast({
        title: 'Error',
        description: 'Relay URL must start with wss:// or ws://',
        variant: 'destructive',
      });
      return;
    }

    updateConfig(current => ({
      ...current,
      relayMetadata: {
        ...current.relayMetadata!,
        relays: [...current.relayMetadata!.relays, { url: relayUrl, read: true, write: true }],
        updatedAt: Date.now(),
      },
    }));

    setNewRelayUrl('');
    setShowRelayDialog(false);
    toast({
      title: 'Success',
      description: 'Relay added successfully!',
    });
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
  }, [kindFilter, currentRelay, loadEvents]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Nostr Relay Viewer</h1>
            
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Relay Settings */}
              <Dialog open={showRelayDialog} onOpenChange={setShowRelayDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Relay Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Current Relay</label>
                      <Select value={currentRelay} onValueChange={setCurrentRelay}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {config.relayMetadata.relays.map((relay) => (
                            <SelectItem key={relay.url} value={relay.url}>
                              {relay.url}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Add New Relay</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          placeholder="wss://relay.example.com"
                          value={newRelayUrl}
                          onChange={(e) => setNewRelayUrl(e.target.value)}
                        />
                        <Button onClick={addRelay}>Add</Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Login Area */}
              <LoginArea />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search Section */}
        <div className="mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Search by Kind Number</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter kind number (e.g., 1)"
                  value={searchKind}
                  onChange={(e) => setSearchKind(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button onClick={() => loadEvents()} disabled={loading} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Create Note Button */}
            {user && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Note
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Note</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={4}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateNote} disabled={isPublishing || !newNoteContent.trim()}>
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
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Showing events of kind:</span>
          <Badge variant="secondary">{kindFilter}</Badge>
          <span className="text-sm text-muted-foreground">from relay:</span>
          <Badge variant="outline">{currentRelay}</Badge>
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <AuthorDisplay pubkey={event.pubkey} size="sm" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
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
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Raw Event Data</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
                                {JSON.stringify(event, null, 2)}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {/* Delete button - only show for user's own events */}
                        {user && event.pubkey === user.pubkey && (
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
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Vibed with{' '}
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MKStack
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
