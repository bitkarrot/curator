import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuthorDisplay } from '@/components/AuthorDisplay';
import { NoteContent } from '@/components/NoteContent';
import { RelaySeenOnButton } from '@/components/RelaySeenOnButton';
import type { NostrEvent } from '@nostrify/nostrify';

interface NoteDetailDialogProps {
  event: NostrEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRelay?: string;
}

/**
 * A dialog that shows the full content of a note with rendered media,
 * author info, and relay information.
 */
export function NoteDetailDialog({
  event,
  open,
  onOpenChange,
  currentRelay,
}: NoteDetailDialogProps) {
  const [showRawJson, setShowRawJson] = useState(false);

  if (!event) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-2 sm:mx-4 w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <AuthorDisplay pubkey={event.pubkey} size="sm" />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(event.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge variant="outline">Kind {event.kind}</Badge>
                <RelaySeenOnButton event={event} currentRelay={currentRelay} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawJson(!showRawJson)}
                  title={showRawJson ? "Show rendered" : "Show raw JSON"}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogTitle className="sr-only">Note Details</DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="p-4 sm:p-6 pt-0">
          {showRawJson ? (
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(event, null, 2)}
            </pre>
          ) : (
            <div className="space-y-4">
              {/* Rendered note content with media */}
              <NoteContent event={event} className="text-sm" />

              {/* Tags display */}
              {event.tags.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {event.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag[0]}: {tag[1]?.substring(0, 20)}
                        {tag[1] && tag[1].length > 20 ? '...' : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
