import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/hooks/useAppContext';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();
  const { config } = useAppContext();
  const gateway = config.defaultGateway || 'njump.me';

  useEffect(() => {
    if (identifier) {
      // Small delay to show the redirecting state
      const timer = setTimeout(() => {
        window.location.href = `https://${gateway}/${identifier}`;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [identifier, gateway]);

  if (!identifier) {
    return <NotFound />;
  }

  try {
    nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="w-full max-w-md border-2">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10 animate-pulse">
                <RefreshCw className="h-8 w-8 text-primary animate-spin-slow" />
              </div>
            </div>
            <CardTitle>Redirecting to Nostr Gateway</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              We're taking you to <strong>{gateway}</strong> to view this Nostr content.
              Our local viewer is currently under development.
            </p>
            <div className="p-3 bg-muted rounded-md text-xs font-mono break-all">
              {identifier}
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <a href={`https://${gateway}/${identifier}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Go to {gateway} now
                </a>
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <a href={gateway === 'njump.me' ? `https://nostr.at/${identifier}` : `https://njump.me/${identifier}`} target="_blank" rel="noopener noreferrer">
                  Try on {gateway === 'njump.me' ? 'nostr.at' : 'njump.me'} instead
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
