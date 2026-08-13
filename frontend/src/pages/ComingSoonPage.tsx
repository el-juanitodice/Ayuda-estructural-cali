import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ComingSoonPageProps {
  titulo: string;
  descripcion?: string;
}

export function ComingSoonPage({
  titulo,
  descripcion = 'Esta sección se migrará pronto al nuevo frontend conectado al backend NestJS.',
}: ComingSoonPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
    </Card>
  );
}
