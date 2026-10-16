import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CopyLinkButtonProps {
    link: string;
    className?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function CopyLinkButton({ link, className, variant = 'outline' }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    return (
        <Button 
            variant={variant} 
            className={className} 
            onClick={handleCopy}
            type="button"
        >
            {copied ? (
                <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                </>
            ) : (
                <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                </>
            )}
        </Button>
    );
}
