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

// Popular relays list
const availableRelays = [
  { name: 'HiveTalk', url: 'wss://swarm.hivetalk.org' },
  { name: 'Nostr.NET', url: 'wss://relay.nostr.net' },
  { name: 'Damus', url: 'wss://relay.damus.io' },
  { name: 'Nostr.Band', url: 'wss://relay.nostr.band' },
  { name: 'Ditto', url: 'wss://relay.ditto.pub' },
  { name: 'Primal', url: 'wss://relay.primal.net' },
];

export function RelaySelector({ className }: RelaySelectorProps) {
  const { config, updateConfig } = useAppContext();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const currentRelayUrl = config.relayMetadata.relays[0]?.url || 'wss://swarm.hivetalk.org';
  const selectedOption = availableRelays.find((option) => option.url === currentRelayUrl);

  // Function to normalize relay URL by adding wss:// if no protocol is present
  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    
    // Check if it already has a protocol
    if (trimmed.includes('://')) {
      return trimmed;
    }
    
    // Add wss:// prefix
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
    
    // Basic validation - should contain at least a domain-like structure
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
            placeholder="Search relays or type URL..." 
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
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {inputValue ? "Invalid relay URL" : "No relay found."}
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
                      {normalizeRelayUrl(inputValue)}
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
