import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useAppContext } from '@/hooks/useAppContext';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Wifi, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { normalizeRelayUrl } from '@/lib/utils';
import { DEFAULT_RELAYS } from '@/lib/constants';

export default function SettingsPage() {
  const { config, updateConfig } = useAppContext();
  const { toast } = useToast();
  const [newRelayUrl, setNewRelayUrl] = useState('');

  useSeoMeta({
    title: 'Settings - Curator',
    description: 'Manage your application settings and relays.',
  });

  const relays = config.relayMetadata.relays;

  const handleAddRelay = () => {
    const normalized = normalizeRelayUrl(newRelayUrl);
    if (!normalized) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid relay URL (e.g., wss://relay.damus.io)",
        variant: "destructive",
      });
      return;
    }

    if (relays.some(r => r.url === normalized)) {
      toast({
        title: "Relay already exists",
        description: "This relay is already in your list.",
        variant: "destructive",
      });
      return;
    }

    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        relays: [...(current.relayMetadata?.relays || []), { url: normalized, read: true, write: true }],
        updatedAt: Date.now(),
      },
    }));

    setNewRelayUrl('');
    toast({
      title: "Relay added",
      description: `${normalized} has been added to your list.`,
    });
  };

  const handleRemoveRelay = (url: string) => {
    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        relays: (current.relayMetadata?.relays || []).filter(r => r.url !== url),
        updatedAt: Date.now(),
      },
    }));

    toast({
      title: "Relay removed",
      description: `${url} has been removed from your list.`,
    });
  };

  const handleRestoreDefaults = () => {
    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        ...current.relayMetadata,
        relays: DEFAULT_RELAYS,
        updatedAt: Date.now(),
      },
    }));

    toast({
      title: "Defaults restored",
      description: "Relay list has been reset to defaults.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your application preferences and relay connections.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Relay Management</CardTitle>
              <CardDescription>
                These relays are used for searching and syncing content.
                Any changes here are saved to your local storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Add New Relay</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="wss://relay.example.com"
                    value={newRelayUrl}
                    onChange={(e) => setNewRelayUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRelay()}
                  />
                  <Button onClick={handleAddRelay}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Current Relays</Label>
                  <Button variant="ghost" size="sm" onClick={handleRestoreDefaults} className="text-xs text-muted-foreground hover:text-foreground">
                    Restore Defaults
                  </Button>
                </div>

                <div className="border rounded-md divide-y">
                  {relays.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/20">
                      <Wifi className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No relays configured. Use the defaults or add your own.</p>
                      <Button variant="link" onClick={handleRestoreDefaults} className="mt-2">
                        Load default relays
                      </Button>
                    </div>
                  ) : (
                    relays.map((relay) => (
                      <div key={relay.url} className="flex items-center justify-between p-4 bg-card">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-primary/10 rounded-full shrink-0">
                            <Wifi className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{relay.url}</span>
                            <div className="flex gap-2 mt-1">
                              {relay.read && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">Read</span>}
                              {relay.write && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Write</span>}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveRelay(relay.url)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {config.relayMetadata.updatedAt > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-sm border border-blue-100 dark:border-blue-900/30">
                  <Check className="h-4 w-4" />
                  <span>Relay list synced from your Nostr profile on {new Date(config.relayMetadata.updatedAt * 1000).toLocaleString()}</span>
                </div>
              )}

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-md text-xs border border-yellow-200 dark:border-yellow-900/30 flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>
                  <strong>Tip:</strong> These relays are used to fetch your profile and settings.
                  Adding too many relays may slow down the application.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
