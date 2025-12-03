import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Navigation } from '@/components/Navigation';
import { PublishModeToggle } from '@/components/PublishModeToggle';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const CreatePage = () => {
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { toast } = useToast();

  const [noteContent, setNoteContent] = useState('');

  useSeoMeta({
    title: 'Create - Curator',
    description: 'Create and publish new Nostr notes.',
  });

  const handleCreateNote = () => {
    if (!noteContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some content for your note.',
        variant: 'destructive',
      });
      return;
    }

    publishEvent({
      kind: 1,
      content: noteContent,
      tags: [],
    }, {
      onSuccess: () => {
        setNoteContent('');
        toast({
          title: 'Success',
          description: 'Note published successfully!',
        });
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreateNote();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to be logged in to create notes. Please log in using the button in the top right corner.
            </AlertDescription>
          </Alert>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Create New Note</h1>
          <p className="text-muted-foreground">
            Share your thoughts with the Nostr network
          </p>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Publishing as
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium break-all text-sm sm:text-base">
                  {user.pubkey.substring(0, 12)}...{user.pubkey.substring(user.pubkey.length - 6)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Your public key</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Write Your Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="note-content" className="text-sm font-medium mb-2 block">
                Content
              </label>
              <Textarea
                id="note-content"
                placeholder="What's on your mind?"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={8}
                className="resize-none text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tip: Press Cmd/Ctrl + Enter to publish quickly
              </p>
            </div>

            {/* Publishing Options */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Publishing Options
                </label>
                <PublishModeToggle />
              </div>

              {/* Character Count */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
                <span>Characters: {noteContent.length}</span>
                {noteContent.length > 280 && (
                  <span className="text-amber-600 text-xs sm:text-sm">
                    Long note - consider breaking into multiple posts
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => setNoteContent('')}
                disabled={isPublishing || !noteContent.trim()}
                className="w-full sm:w-auto"
              >
                Clear
              </Button>
              <Button 
                onClick={handleCreateNote} 
                disabled={isPublishing || !noteContent.trim()}
                className="w-full sm:w-auto"
              >
                {isPublishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Publish Note
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">About Kind 1 Notes</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Kind 1 events are text notes, the most common type of Nostr event</li>
              <li>• Your note will be signed with your private key and published to relays</li>
              <li>• Once published, notes are immutable but can be requested for deletion</li>
              <li>• Notes are public and can be seen by anyone on the Nostr network</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default CreatePage;
