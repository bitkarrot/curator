import { useState, useRef, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_RELAYS } from '@/lib/constants';
import { ArrowRight, RefreshCw, AlertCircle, CheckCircle2, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { NRelay1, NostrEvent } from '@nostrify/nostrify';
import { format, addHours, differenceInHours } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

const SYNC_KINDS = [
  { kind: 0, label: 'Profile Metadata', description: 'Name, about, picture' },
  { kind: 1, label: 'Short Text Notes', description: 'Standard posts' },
  { kind: 3, label: 'Contact Lists', description: 'Follows' },
  { kind: 10000, label: 'Mute Lists', description: 'Muted users' },
  { kind: 10001, label: 'Pinned Notes', description: 'Pinned posts' },
  { kind: 10002, label: 'Relay Lists', description: 'Read/Write relays' },
  { kind: 10003, label: 'Bookmarks', description: 'Bookmarked events' },
  { kind: 10004, label: 'Communities', description: 'Community definitions' },
  { kind: 10007, label: 'Search Relays', description: 'Relays for search' },
  { kind: 10015, label: 'Interests', description: 'Interests list' },
  { kind: 10030, label: 'Emoji Lists', description: 'Custom emojis' },
  { kind: 10050, label: 'DM Relays', description: 'Relays for DMs' },
  { kind: 30000, label: 'Follow sets', description: 'Categorized follow lists' },
  { kind: 30008, label: 'Profile Badges', description: 'Badge definition and usage' },
  { kind: 30023, label: 'Long-form Content', description: 'Article/blog posts' },
  { kind: 30024, label: 'Draft Long-form Content', description: 'Draft articles' },
];

interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function SyncPage() {
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  const [sourceRelay, setSourceRelay] = useState<string>('');
  const [targetRelay, setTargetRelay] = useState<string>('');
  const [customSource, setCustomSource] = useState('');
  const [customTarget, setCustomTarget] = useState('');

  // Time selection state
  const [sinceHours, setSinceHours] = useState<number>(-24);
  const [untilHours, setUntilHours] = useState<number>(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [syncAll, setSyncAll] = useState(false);
  const [selectedKinds, setSelectedKinds] = useState<number[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ fetched: 0, published: 0, errors: 0 });
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSyncing && statusRef.current) {
      statusRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isSyncing]);

  useSeoMeta({
    title: 'Sync Notes - Curator',
    description: 'Sync your Nostr notes between relays.',
  });

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ timestamp: Date.now(), message, type }, ...prev]);
  };

  const handleKindToggle = (kind: number) => {
    setSelectedKinds(prev =>
      prev.includes(kind) ? prev.filter(k => k !== kind) : [...prev, kind]
    );
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      const now = new Date();
      // Calculate hours difference from now
      // If range.from is in the past, differenceInHours(range.from, now) would be negative
      // e.g. yesterday vs today is -24
      const newSince = differenceInHours(range.from, now);
      setSinceHours(newSince);

      if (range.to) {
        // We probably want the end of the day or just the date? 
        // Sync usually implies "until this time". 
        // If they pick a range, e.g. Oct 1 to Oct 2. 
        // Range.to might be Oct 2 00:00:00. 
        // Let's assume we want to include the whole 'to' day, or just use the exact time if provided?
        // The Calendar component usually returns start of day 00:00:00.
        // So for the end date, we might want to Add 24 hours to cover that day if it matches 'from' or is just a date selection?
        // Actually, let's just stick to exact difference for now or maybe add 24h to 'to' if it's a closed range?
        // Let's just use the exact diff for simplicity first.
        const newUntil = differenceInHours(range.to, now) + 24; // Include the full end day
        setUntilHours(newUntil);
      } else {
        // If only start date selected, maybe reset until to 0 (now) or keep it?
        // Let's leave until alone or set to 0?
        // If user just clicks one date, usually 'to' is undefined.
        // Let's set until roughly to 'since + 24' or just 0?
        setUntilHours(newSince + 24);
      }
    }
  };

  // Helper to format the displayed time range
  const getSelectedRangeText = () => {
    const now = new Date();
    const start = addHours(now, sinceHours);
    const end = addHours(now, untilHours);
    return `from ${format(start, 'M/d/yyyy h:mm a')} to ${format(end, 'M/d/yyyy h:mm a')}`;
  };

  const handleSync = async () => {
    if (!user) return;

    // Determine effective URLs
    const sourceUrl = sourceRelay === 'custom' ? customSource : sourceRelay;
    const targetUrl = targetRelay === 'custom' ? customTarget : targetRelay;

    if (!sourceUrl || !targetUrl) {
      addLog('Please select both source and target relays.', 'error');
      return;
    }

    if (sourceUrl === targetUrl) {
      addLog('Source and target relays cannot be the same.', 'error');
      return;
    }

    if (!syncAll && selectedKinds.length === 0) {
      addLog('Please select at least one kind to sync or choose "Sync All".', 'error');
      return;
    }

    setIsSyncing(true);
    setProgress(0);
    setLogs([]);
    setStats({ fetched: 0, published: 0, errors: 0 });
    addLog(`Starting sync from ${sourceUrl} to ${targetUrl}...`);

    try {
      const source = new NRelay1(sourceUrl);
      const target = new NRelay1(targetUrl);

      addLog('Connecting to relays...');
      // NRelay1 connects automatically on request usually, strictly speaking we might want to check connection but let's try reading.

      const kinds = syncAll ? undefined : selectedKinds;


      const now = new Date();
      const since = Math.floor(addHours(now, sinceHours).getTime() / 1000);
      const until = Math.floor(addHours(now, untilHours).getTime() / 1000);

      // Filter with time range
      // Note: NRelay1 query might need NIP-01 filters which support 'since' and 'until'
      const filters = [{
        authors: [user.pubkey],
        kinds,
        since,
        until
      }];

      addLog(`Time range: ${new Date(since * 1000).toLocaleString()} to ${new Date(until * 1000).toLocaleString()}`);
      addLog(`Fetching events for ${user.pubkey.slice(0, 8)}...`);

      const events: NostrEvent[] = [];

      // Fetching
      // NRelay1 query returns an async generator or array.
      // @nostrify/nostrify NRelay1.query returns AsyncGenerator<NostrEvent>

      try {
        const result = await source.query(filters);
        for (const event of result) {
          events.push(event);
          setStats(prev => ({ ...prev, fetched: prev.fetched + 1 }));
          if (events.length % 10 === 0) {
            addLog(`Fetched ${events.length} events...`);
          }
        }
      } catch (e) {
        console.error("Fetch error", e);
        addLog(`Error fetching from source: ${e instanceof Error ? e.message : String(e)}`, 'error');
        // We might want to abort or continue with what we have? Let's abort if source fails completely.
        setIsSyncing(false);
        return;
      }

      addLog(`Total events fetched: ${events.length}. Starting publish...`);

      if (events.length === 0) {
        addLog('No events found to sync.', 'info');
        setIsSyncing(false);
        setProgress(100);
        return;
      }

      // Publishing
      let publishedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        try {
          await target.event(event);
          publishedCount++;
          setStats(prev => ({ ...prev, published: publishedCount }));
        } catch (e) {
          console.error("Publish error", e);
          errorCount++;
          setStats(prev => ({ ...prev, errors: errorCount }));
          addLog(`Failed to publish event ${event.id.slice(0, 8)}: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }

        // Update progress
        const currentProgress = Math.round(((i + 1) / events.length) * 100);
        setProgress(currentProgress);
      }

      addLog('Sync completed!', 'success');

    } catch (error) {
      console.error("Sync error", error);
      addLog(`Unexpected error during sync: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };



  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Sync Notes</h1>
            <p className="text-muted-foreground">
              Copy your events from one relay to another.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Source Relay */}
            <Card>
              <CardHeader>
                <CardTitle>Source Relay</CardTitle>
                <CardDescription>Where to fetch your notes from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={sourceRelay} onValueChange={setSourceRelay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a relay" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.relayMetadata.relays.map(relay => (
                      <SelectItem key={relay.url} value={relay.url}>
                        {relay.url.replace(/^wss?:\/\//, '')}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom URL...</SelectItem>
                  </SelectContent>
                </Select>
                {sourceRelay === 'custom' && (
                  <Input
                    placeholder="wss://..."
                    value={customSource}
                    onChange={e => setCustomSource(e.target.value)}
                  />
                )}
              </CardContent>
            </Card>

            {/* Target Relay */}
            <Card>
              <CardHeader>
                <CardTitle>Target Relay</CardTitle>
                <CardDescription>Where to send your notes to</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={targetRelay} onValueChange={setTargetRelay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a relay" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.relayMetadata.relays.map(relay => (
                      <SelectItem key={relay.url} value={relay.url}>
                        {relay.url.replace(/^wss?:\/\//, '')}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom URL...</SelectItem>
                  </SelectContent>
                </Select>
                {targetRelay === 'custom' && (
                  <Input
                    placeholder="wss://..."
                    value={customTarget}
                    onChange={e => setCustomTarget(e.target.value)}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Time Range Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Time Range</CardTitle>
              <CardDescription>Select the time period to sync notes from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="space-y-2">
                  <Label>Since (hours)</Label>
                  <Input
                    type="number"
                    value={sinceHours}
                    onChange={e => setSinceHours(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Until (hours)</Label>
                  <Input
                    type="number"
                    value={untilHours}
                    onChange={e => setUntilHours(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={handleDateRangeSelect}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="text-sm text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                <strong>Selected range (Local Time):</strong><br />
                {getSelectedRangeText()}
              </div>

            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Configuration</CardTitle>
              <CardDescription>Select what you want to sync</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Sync All Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    Copy every event found (may take longer)
                  </p>
                </div>
                <Switch
                  checked={syncAll}
                  onCheckedChange={setSyncAll}
                />
              </div>

              {!syncAll && (
                <div className="space-y-4">
                  <Label>Select Kinds</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SYNC_KINDS.map((item) => (
                      <div
                        key={item.kind}
                        className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent cursor-pointer"
                        onClick={() => handleKindToggle(item.kind)}
                      >
                        <Checkbox
                          checked={selectedKinds.includes(item.kind)}
                          onCheckedChange={() => handleKindToggle(item.kind)}
                        />
                        <div className="space-y-1 leading-none">
                          <Label className="cursor-pointer">
                            {item.label} <span className="text-xs text-muted-foreground">(Kind {item.kind})</span>
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full md:w-auto md:min-w-[200px]"
                size="lg"
                onClick={handleSync}
                disabled={isSyncing || !user}
                title={!user ? "Please login to sync" : "Start Sync"}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : !user ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Login Required
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start Sync
                  </>
                )}
              </Button>

            </CardContent>
          </Card>

          {/* Terminal / Progress */}
          {(isSyncing || logs.length > 0) && (
            <Card ref={statusRef} className="bg-slate-950 text-slate-50 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider text-slate-400">Sync Status</CardTitle>
                  <div className="flex items-center gap-4 text-sm font-mono">
                    <span className="text-blue-400">Fetched: {stats.fetched}</span>
                    <span className="text-green-400">Published: {stats.published}</span>
                    {stats.errors > 0 && <span className="text-red-400">Errors: {stats.errors}</span>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={progress} className="h-2 bg-slate-800" />

                  <ScrollArea className="h-[200px] w-full rounded-md border border-slate-800 bg-slate-900 p-4 font-mono text-xs">
                    <div className="space-y-1">
                      {logs.map((log, i) => (
                        <div key={i} className={`flex items-start gap-2 ${log.type === 'error' ? 'text-red-400' :
                          log.type === 'success' ? 'text-green-400' :
                            'text-slate-300'
                          }`}>
                          <span className="text-slate-600 shrink-0">
                            [{new Date(log.timestamp).toLocaleTimeString()}]
                          </span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
