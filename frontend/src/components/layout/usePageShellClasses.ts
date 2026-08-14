import { useLocation } from 'react-router-dom';
import { MOTION } from '@/constants/motion';
import { routes } from '@/constants/routes';
import { cn } from '@/lib/utils';

export function usePageShellClasses() {
  const { pathname } = useLocation();
  const esMapa = pathname === routes.home;
  const esAnchoCompleto =
    pathname === routes.reportar ||
    pathname === routes.admin ||
    pathname === routes.moderacion ||
    pathname === routes.tablero ||
    pathname === routes.revision ||
    pathname === routes.campo;
  const esReportar = pathname === routes.reportar;

  return {
    pathname,
    esMapa,
    mainClassName: cn(
      'min-h-0 flex-1 px-4 py-6 sm:px-6',
      esMapa && 'mx-auto flex w-full max-w-[1400px] flex-col py-4 sm:py-5',
      esReportar && 'flex flex-col py-4 sm:py-5',
      !esMapa && (esAnchoCompleto ? 'mx-auto w-full max-w-[1400px]' : 'mx-auto w-full max-w-3xl'),
    ),
    innerClassName: cn(
      MOTION.fadeInClass,
      esMapa && 'flex min-h-0 flex-1 flex-col',
      esReportar && 'flex min-h-0 flex-1 flex-col',
    ),
  };
}
