import { completarConNinguno, validarMatrizDanos } from '@shared/ais.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DanoAis } from '@/types/revision';

const NIVELES = ['ninguno', 'leve', 'moderado', 'fuerte', 'severo'] as const;

function sumaFila(f: DanoAis) {
  return f.pct_ninguno + f.pct_leve + f.pct_moderado + f.pct_fuerte + f.pct_severo;
}

export function DamageMatrix({
  filas,
  onChange,
  soloLectura = false,
}: {
  filas: DanoAis[];
  onChange: (filas: DanoAis[]) => void;
  soloLectura?: boolean;
}) {
  const validacion = validarMatrizDanos(
    filas.map((d) => ({
      elemento: d.elemento,
      ninguno: d.pct_ninguno,
      leve: d.pct_leve,
      moderado: d.pct_moderado,
      fuerte: d.pct_fuerte,
      severo: d.pct_severo,
    })),
  );

  const setPct = (index: number, nivel: (typeof NIVELES)[number], valor: string) => {
    const nuevas = [...filas];
    const n = Math.max(0, Math.min(100, Number(valor) || 0));
    nuevas[index] = { ...nuevas[index], [`pct_${nivel}`]: n } as DanoAis;
    onChange(nuevas);
  };

  const completar = (index: number) => {
    const f = filas[index];
    const c = completarConNinguno({
      leve: f.pct_leve,
      moderado: f.pct_moderado,
      fuerte: f.pct_fuerte,
      severo: f.pct_severo,
    });
    const nuevas = [...filas];
    nuevas[index] = { ...f, pct_ninguno: c.ninguno };
    onChange(nuevas);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Elemento</TableHead>
              {NIVELES.map((n) => (
                <TableHead key={n}>{n}</TableHead>
              ))}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f, i) => {
              const suma = sumaFila(f);
              return (
                <TableRow key={f.elemento} className={suma !== 100 ? 'bg-destructive/5' : undefined}>
                  <TableCell>{f.elemento.replace(/_/g, ' ')}</TableCell>
                  {NIVELES.map((n) => (
                    <TableCell key={n}>
                      {soloLectura ? (
                        f[`pct_${n}` as keyof DanoAis]
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-8 w-16"
                          value={f[`pct_${n}` as keyof DanoAis] as number}
                          onChange={(e) => setPct(i, n, e.target.value)}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    {soloLectura ? (
                      suma === 100 ? '✓' : suma
                    ) : suma !== 100 ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => completar(i)}>
                        ={100 - suma > 0 ? '+' : ''}
                        {100 - suma}
                      </Button>
                    ) : (
                      '✓'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {!validacion.ok && (
        <p className="text-sm text-destructive">Cada fila debe sumar exactamente 100%.</p>
      )}
    </div>
  );
}
