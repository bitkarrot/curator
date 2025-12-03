import { Check, ChevronsUpDown, Wifi, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppContext } from "@/hooks/useAppContext";
import { useState } from "react";

interface RelaySelectorProps {
  className?: string;
}

type AvailableRelay = { name: string; url: string };

// Popular relays list (default fallback)
const defaultAvailableRelays: AvailableRelay[] = [
  { name: 'Swarm Hivetalk', url: 'wss://swarm.hivetalk.org' },
  { name: 'Beeswax Hivetalk', url: 'wss://beeswax.hivetalk.org' },
  { name: 'Nostr.NET', url: 'wss://relay.nostr.net' },
  { name: 'Damus', url: 'wss://relay.damus.io' },
  { name: 'Primal', url: 'wss://relay.primal.net' },
];

// Load popular relays from Vite env (VITE_POPULAR_RELAYS) when available
function getAvailableRelays(): AvailableRelay[] {
  const envValue = import.meta.env.VITE_POPULAR_RELAYS;

  if (!envValue) return defaultAvailableRelays;

  try {
    const parsed = JSON.parse(envValue);

    if (!Array.isArray(parsed)) return defaultAvailableRelays;

    const relays: AvailableRelay[] = parsed.filter((item: any) =>
      item && typeof item.name === 'string' && typeof item.url === 'string'
    );

    return relays.length > 0 ? relays : defaultAvailableRelays;
  } catch {
    return defaultAvailableRelays;
  }
}

const availableRelays = getAvailableRelays();

export function RelaySelector({ className }: RelaySelectorProps) {
  const { config, updateConfig } = useAppContext();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const currentRelayUrl = config.relayMetadata.relays[0]?.url || 'wss://swarm.hivetalk.org';
  const selectedOption = availableRelays.find((option) => option.url === currentRelayUrl);

  // Function to normalize relay URL - only add wss:// if no protocol is present and it's not localhost
  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    
    // If it already has a protocol, return as-is
    if (trimmed.includes('://')) {
      return trimmed;
    }
    
    // For localhost or IP addresses, don't auto-add protocol - let user specify
    if (trimmed.startsWith('localhost') || trimmed.match(/^\d+\.\d+\.\d+\.\d+/)) {
      // If user types localhost:3777 without protocol, they probably want ws://
      // But we'll let them be explicit about it
      return trimmed;
    }
    
    // For regular domains, add wss:// prefix
    return `wss://${trimmed}`;
  };

  // Function to display what URL will be used (for preview purposes)
  const getDisplayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    
    // If it already has a protocol or looks like it's being typed, show as-is
    if (trimmed.includes('://') || trimmed.startsWith('ws:') || trimmed.startsWith('wss:') || trimmed.startsWith('http:') || trimmed.startsWith('https:')) {
      return trimmed;
    }
    
    // For localhost or IP addresses without protocol, show as-is (user needs to add protocol)
    if (trimmed.startsWith('localhost') || trimmed.match(/^\d+\.\d+\.\d+\.\d+/)) {
      return trimmed;
    }
    
    // For regular domains, show with wss:// prefix
    return `wss://${trimmed}`;
  };

  // Handle adding a custom relay or selecting an existing one
  const handleSelectRelay = (url: string) => {
    const normalizedUrl = normalizeRelayUrl(url);
    if (normalizedUrl) {
      // Update the config to move selected relay to the front
      const existingRelays = config.relayMetadata.relays.filter(r => r.url !== normalizedUrl);
      const selectedRelay = config.relayMetadata.relays.find(r => r.url === normalizedUrl) || 
                           { url: normalizedUrl, read: true, write: true };
      
      updateConfig(current => ({
        ...current,
        relayMetadata: {
          ...current.relayMetadata!,
          relays: [selectedRelay, ...existingRelays],
          updatedAt: Date.now(),
        },
      }));
      
      setOpen(false);
      setInputValue("");
    }
  };

  // Check if input value looks like a valid relay URL
  const isValidRelayInput = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    
    // If it already has a protocol, validate directly
    if (trimmed.includes('://')) {
      try {
        new URL(trimmed);
        return true;
      } catch {
        return false;
      }
    }
    
    // For localhost or IP addresses without protocol, they need to specify the full URL
    if (trimmed.startsWith('localhost') || trimmed.match(/^\d+\.\d+\.\d+\.\d+/)) {
      return false; // Require full URL with protocol for localhost/IP
    }
    
    // For regular domains, try with wss:// prefix
    const normalized = normalizeRelayUrl(trimmed);
    try {
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            <span className="truncate">
              {selectedOption 
                ? selectedOption.name 
                : currentRelayUrl 
                  ? currentRelayUrl.replace(/^wss?:\/\//, '')
                  : "Select relay..."
              }
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search relays or type full URL (e.g., ws://localhost:3777)" 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue && isValidRelayInput(inputValue) ? (
                <CommandItem
                  onSelect={() => handleSelectRelay(inputValue)}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Add custom relay</span>
                    <span className="text-xs text-muted-foreground">
                      {getDisplayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {inputValue ? "Invalid relay URL. Use full URL (e.g., ws://localhost:3777)" : "No relay found."}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {availableRelays
                .filter((option) => 
                  !inputValue || 
                  option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                  option.url.toLowerCase().includes(inputValue.toLowerCase())
                )
                .map((option) => (
                  <CommandItem
                    key={option.url}
                    value={option.url}
                    onSelect={(currentValue) => {
                      handleSelectRelay(currentValue);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentRelayUrl === option.url ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-xs text-muted-foreground">{option.url}</span>
                    </div>
                  </CommandItem>
                ))}
              {inputValue && isValidRelayInput(inputValue) && (
                <CommandItem
                  onSelect={() => handleSelectRelay(inputValue)}
                  className="cursor-pointer border-t"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Add custom relay</span>
                    <span className="text-xs text-muted-foreground">
                      {getDisplayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
