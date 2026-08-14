import { toastManager } from '@/components/ui/toast';

export type AppToastOptions = {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type ToastType = 'success' | 'error' | 'info' | 'warning';

function show(type: ToastType | undefined, title: string, options?: AppToastOptions) {
  const id = toastManager.add({
    title,
    description: options?.description,
    type,
    timeout: options?.duration ?? 5000,
    actionProps: options?.action
      ? {
          children: options.action.label,
          onClick: () => {
            options.action!.onClick();
            toastManager.close(id);
          },
        }
      : undefined,
  });

  return id;
}

export const toast = Object.assign(
  (title: string, options?: AppToastOptions) => show(undefined, title, options),
  {
    success: (title: string, options?: AppToastOptions) => show('success', title, options),
    error: (title: string, options?: AppToastOptions) => show('error', title, options),
    info: (title: string, options?: AppToastOptions) => show('info', title, options),
    warning: (title: string, options?: AppToastOptions) => show('warning', title, options),
  },
);
