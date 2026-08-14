import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function SidebarMobileTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'size-9 border-0 shadow-none ring-0 focus-visible:ring-0',
        className,
      )}
      onClick={toggleSidebar}
      {...props}
    >
      <Menu className="size-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
