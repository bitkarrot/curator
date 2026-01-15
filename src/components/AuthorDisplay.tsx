import { useAuthor } from '@/hooks/useAuthor';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { nip19 } from 'nostr-tools';

interface AuthorDisplayProps {
  pubkey: string;
  showLink?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AuthorDisplay({ pubkey, showLink = true, size = 'md', className = '' }: AuthorDisplayProps) {
  const { data: authorData, isLoading } = useAuthor(pubkey);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const displayName = authorData?.metadata?.name ||
    authorData?.metadata?.display_name ||
    `${pubkey.substring(0, 8)}...${pubkey.substring(pubkey.length - 4)}`;

  const avatarUrl = authorData?.metadata?.picture;

  // Generate fallback initials from display name or pubkey
  const fallbackText = authorData?.metadata?.name
    ? authorData.metadata.name.substring(0, 2).toUpperCase()
    : pubkey.substring(0, 2).toUpperCase();

  const npub = nip19.npubEncode(pubkey);
  const profileUrl = `https://njump.me/${npub}`;

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className={sizeClasses[size]}>
        {avatarUrl && (
          <AvatarImage
            src={avatarUrl}
            alt={displayName}
            onError={(e) => {
              // Hide broken images
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <AvatarFallback className={`${textSizeClasses[size]} font-medium`}>
          {isLoading ? '...' : fallbackText}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${textSizeClasses[size]}`}>
          {displayName}
        </div>
        {authorData?.metadata?.nip05 && (
          <div className={`text-muted-foreground truncate ${size === 'sm' ? 'text-xs' : 'text-xs'}`}>
            {authorData.metadata.nip05}
          </div>
        )}
      </div>
    </div>
  );

  if (showLink) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:bg-muted/50 rounded-md transition-colors inline-block"
      >
        {content}
      </a>
    );
  }

  return content;
}
