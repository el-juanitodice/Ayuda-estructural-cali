import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { ETIQUETA_HABITABILIDAD } from '@shared/ais.js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { estadoConRadicado, routes } from '@/constants/routes';
import { get } from '@/lib/api';
import type { FormularioResponse, HabitabilidadColor } from '@/types/revision';

const SIGNIFICADO: Record<HabitabilidadColor, string> = {
  verde:
    'La edificación puede usarse y habitarse normalmente. Si aparecen nuevos daños tras una réplica, repórtela de nuevo.',
  amarillo:
    'USO RESTRINGIDO. Solo entradas breves para recuperar bienes esenciales. No pernocte. Siga las restricciones indicadas por el ingeniero.',
  naranja:
    'NO HABITABLE. Prohibido habitarla hasta ser reparada y reinspeccionada. Entradas solo autorizadas y acompañadas.',
  rojo: 'PELIGRO DE COLAPSO. Prohibido entrar. Aléjese de la edificación y no permita el ingreso de nadie.',
};

const FONDO_COLOR: Record<HabitabilidadColor, string> = {
  verde: 'aviso-fondo-verde',
  amarillo: 'aviso-fondo-amarillo',
  naranja: 'aviso-fondo-naranja',
  rojo: 'aviso-fondo-rojo',
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO');
}

export function NoticePage() {
  const [params] = useSearchParams();
  const uuid = params.get('uuid') ?? '';
  const [datos, setDatos] = useState<FormularioResponse | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!uuid) {
      setError('Falta el identificador del formulario (?uuid=…).');
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    get<FormularioResponse>(`/campo/formularios/${uuid}`)
      .then(async (r) => {
        setDatos(r);
        if (r.formulario.consecutivo) {
          const urlFicha = `${window.location.origin}${estadoConRadicado(r.formulario.consecutivo)}`;
          const dataUrl = await QRCode.toDataURL(urlFicha, { width: 220, margin: 1 });
          setQr(dataUrl);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el aviso'))
      .finally(() => setCargando(false));
  }, [uuid]);

  if (cargando) {
    return <p className="text-muted-foreground">Cargando aviso…</p>;
  }

  if (error || !datos) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error ?? 'No se encontró el formulario.'}</AlertDescription>
      </Alert>
    );
  }

  const f = datos.formulario;

  if (f.estado !== 'firmado' || !f.habitabilidad_final) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Este formulario aún no tiene dictamen firmado.</AlertDescription>
      </Alert>
    );
  }

  const color = f.habitabilidad_final;

  return (
    <div>
      <div className="no-imprimir mb-6 text-center">
        <Button type="button" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir (o guardar como PDF)
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          Pega una copia en cada entrada y explícalo verbalmente a los ocupantes.
        </p>
        <Button variant="link" className="mt-1" asChild>
          <a href={routes.revision}>Volver a revisión</a>
        </Button>
      </div>

      <article className={`aviso-carta ${FONDO_COLOR[color]}`}>
        <header>
          <p className="aviso-titulo">INSPECCIÓN POST-SÍSMICA DE EDIFICACIONES</p>
          <p className="aviso-sub">Formulario Único AIS — Emergencia sísmica, agosto de 2026</p>
        </header>

        <div className="aviso-color">{ETIQUETA_HABITABILIDAD[color].toUpperCase()}</div>

        <p className="aviso-significado">{SIGNIFICADO[color]}</p>

        <table className="aviso-datos">
          <tbody>
            <tr>
              <td>Dirección</td>
              <td>{f.direccion || f.reporte_direccion}</td>
            </tr>
            <tr>
              <td>Radicado</td>
              <td>{f.consecutivo}</td>
            </tr>
            <tr>
              <td>N.º de formulario</td>
              <td>{f.numero_formulario}</td>
            </tr>
            <tr>
              <td>Fecha del dictamen</td>
              <td>{f.firmado_en ? formatearFecha(f.firmado_en) : '—'}</td>
            </tr>
            <tr>
              <td>Dictamen</td>
              <td>
                Ing. {f.firmado_por_nombre ?? '—'} — Matrícula {f.firmado_por_matricula ?? '—'}{' '}
                {f.visita_presencial_a
                  ? '(visita presencial)'
                  : '(revisión remota sobre captura de campo)'}
              </td>
            </tr>
            <tr>
              <td>Captura de campo</td>
              <td>
                {f.capturado_por_nombre
                  ? `Ing. ${f.capturado_por_nombre} — Matrícula ${f.capturado_por_matricula ?? '—'}`
                  : '—'}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="aviso-pie">
          {qr && <img className="aviso-qr" src={qr} alt="QR ficha pública" />}
          <div className="space-y-2 text-sm">
            <p>
              Escanee el código para consultar esta ficha. Verifique la matrícula profesional en{' '}
              <strong>copnia.gov.co</strong>.
            </p>
            <p>
              <strong>Este aviso no debe retirarse</strong> mientras la condición no cambie por una
              nueva inspección. Emergencias: <strong>llame al 123</strong>.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
