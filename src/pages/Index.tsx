import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Navigation } from '@/components/Navigation';
import { Github } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useSeoMeta({
    title: 'Curator',
    description: 'A Nostr client for viewing and interacting with relay content.',
  });

  // Redirect to search page on load
  useEffect(() => {
    navigate('/search');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-8">
          <p>Redirecting to search...</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <span>Curator - A Nostr Relay Kind Viewer</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-primary">
              <a href="https://hivetalk.org">
              Hivetalk</a></span>
            <span className="text-muted-foreground">•</span>
            <a
              href="https://github.com/bitkarrot/curator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Github className="h-4 w-4" />
              <span>GitHub Source</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

