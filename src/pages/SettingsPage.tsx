import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useAppContext } from '@/hooks/useAppContext';
import { type AppConfig } from '@/contexts/AppContext';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Wifi, Check, AlertTriangle, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { normalizeRelayUrl } from '@/lib/utils';
import { DEFAULT_RELAYS } from '@/lib/constants';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRelayItemProps {
  relay: { url: string; read: boolean; write: boolean };
  onRemove: (url: string) => void;
}

function SortableRelayItem({ relay, onRemove }: SortableRelayItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: relay.url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-card group"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
        </button>
        <div className="p-2 bg-primary/10 rounded-full shrink-0">
          <Wifi className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{relay.url}</span>
          <div className="flex gap-2 mt-1">
            {relay.read && (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                Read
              </span>
            )}
            {relay.write && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                Write
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onRemove(relay.url)}
      >
        < Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { config, updateConfig } = useAppContext();
  const { toast } = useToast();
  const [newRelayUrl, setNewRelayUrl] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useSeoMeta({
    title: 'Settings - Curator',
    description: 'Manage your application settings and relays.',
  });

  const relays = config.relayMetadata?.relays || [];

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
        ...current.relayMetadata,
        relays: [...(current.relayMetadata?.relays || []), { url: normalized, read: true, write: true }],
        updatedAt: Math.floor(Date.now() / 1000),
      },
    }));

    setNewRelayUrl('');
    toast({
      title: "Relay added",
      description: `${normalized} has been added to your list.`,
    });
  };

  const handleRemoveRelay = (url: string) => {
    updateConfig((current) => {
      const nextRelays = (current.relayMetadata?.relays || []).filter(r => r.url !== url);
      const nextConfig: Partial<AppConfig> = {
        ...current,
        relayMetadata: {
          ...current.relayMetadata!,
          relays: nextRelays,
          updatedAt: Math.floor(Date.now() / 1000),
        },
      };

      if (current.selectedRelayUrl === url) {
        nextConfig.selectedRelayUrl = nextRelays[0]?.url;
      }

      return nextConfig;
    });

    toast({
      title: "Relay removed",
      description: `${url} has been removed from your list.`,
    });
  };

  const handleRestoreDefaults = () => {
    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        ...current.relayMetadata!,
        relays: DEFAULT_RELAYS,
        updatedAt: Math.floor(Date.now() / 1000),
      },
      selectedRelayUrl: DEFAULT_RELAYS[0].url,
    }));

    toast({
      title: "Defaults restored",
      description: "Relay list has been reset to defaults.",
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      updateConfig((current) => {
        const oldIndex = relays.findIndex((r) => r.url === active.id);
        const newIndex = relays.findIndex((r) => r.url === over.id);

        return {
          ...current,
          relayMetadata: {
            ...current.relayMetadata,
            relays: arrayMove(relays, oldIndex, newIndex),
            updatedAt: Math.floor(Date.now() / 1000),
          },
        };
      });

      toast({
        title: "Order updated",
        description: "Your relay priority has been saved.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-lg">
              Manage your application preferences and relay connections.
            </p>
          </div>

          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Relay Management</CardTitle>
              <CardDescription>
                Drag to reorder your preferred relays. The top relay is prioritized for searching and publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <Label htmlFor="relay-url" className="text-base font-semibold">Add New Relay</Label>
                <div className="flex gap-3">
                  <Input
                    id="relay-url"
                    className="h-12 border-2 focus-visible:ring-primary"
                    placeholder="wss://relay.example.com"
                    value={newRelayUrl}
                    onChange={(e) => setNewRelayUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRelay()}
                  />
                  <Button onClick={handleAddRelay} size="lg" className="px-6 font-bold shadow-md hover:shadow-lg transition-all">
                    <Plus className="h-5 w-5 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Current Relays</Label>
                  <Button variant="outline" size="sm" onClick={handleRestoreDefaults} className="text-xs hover:bg-primary hover:text-primary-foreground font-semibold">
                    Restore Defaults
                  </Button>
                </div>

                <div className="border-2 border-muted overflow-hidden rounded-xl shadow-inner bg-muted/30">
                  {relays.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Wifi className="h-12 w-12 mx-auto mb-4 opacity-20 animate-pulse" />
                      <p className="text-lg">No relays configured.</p>
                      <Button variant="link" onClick={handleRestoreDefaults} className="mt-2 text-primary font-bold">
                        Load default relays
                      </Button>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={relays.map((r) => r.url)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="divide-y-2 divide-muted">
                          {relays.map((relay) => (
                            <SortableRelayItem
                              key={relay.url}
                              relay={relay}
                              onRemove={handleRemoveRelay}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>

              {config.relayMetadata?.updatedAt > 0 && (
                <div className="flex items-center gap-3 p-4 bg-primary/5 text-primary rounded-xl text-sm border-2 border-primary/10 shadow-sm transition-all hover:bg-primary/10">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Relay list synced from your Nostr profile on {new Date(config.relayMetadata.updatedAt * 1000).toLocaleString()}</span>
                </div>
              )}

              <div className="mt-6 p-5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-sm border-2 border-amber-500/20 flex gap-4 items-start shadow-sm">
                <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-base">Performance Tip</p>
                  <p className="opacity-90">
                    These relays are used to fetch your profile and settings.
                    Adding too many relays may slow down the application. We recommend keeping it under 5.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
