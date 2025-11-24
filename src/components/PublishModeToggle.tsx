import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/hooks/useAppContext";

export function PublishModeToggle() {
  const { config, updateConfig } = useAppContext();
  
  const isCurrentMode = config.publishMode === 'current';
  const currentRelay = config.relayMetadata.relays[0]?.url || '';
  const writeRelayCount = config.relayMetadata.relays.filter(r => r.write).length;
  
  const handleToggle = (checked: boolean) => {
    updateConfig(current => ({
      ...current,
      publishMode: checked ? 'current' : 'all'
    }));
  };

  const getDisplayText = () => {
    if (isCurrentMode) {
      const relayName = currentRelay.replace(/^wss?:\/\//, '');
      return `Publish to: ${relayName}`;
    } else {
      return `Publish to all ${writeRelayCount} relays`;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="publish-mode"
        checked={isCurrentMode}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="publish-mode" className="text-sm cursor-pointer">
        {getDisplayText()}
      </Label>
    </div>
  );
}
