import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EstadoFormulario } from '../../database/entities/formulario-ais.entity';

interface FilaComuna {
  comuna: string;
  nuevos: number;
  por_asignar: number;
  en_proceso: number;
  cerrados: number;
}

interface FilaColor {
  color: string;
  total: number;
}

@Injectable()
export class TableroService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async cobertura() {
    const porComuna = await this.dataSource.query<FilaComuna[]>(`
      SELECT COALESCE(comuna, 'sin comuna') AS comuna,
        SUM(estado = 'nuevo') AS nuevos,
        SUM(estado IN ('validado', 'vencido')) AS por_asignar,
        SUM(estado IN ('asignado', 'en_captura', 'en_revision_a', 'requiere_especialista')) AS en_proceso,
        SUM(estado = 'cerrado') AS cerrados
      FROM reportes
      GROUP BY COALESCE(comuna, 'sin comuna')
      ORDER BY comuna
    `);

    const porColor = await this.dataSource.query<FilaColor[]>(`
      SELECT habitabilidad_final AS color, COUNT(*) AS total
      FROM formularios_ais
      WHERE estado = ? AND habitabilidad_final IS NOT NULL
      GROUP BY habitabilidad_final
      ORDER BY habitabilidad_final
    `, [EstadoFormulario.FIRMADO]);

    return {
      por_comuna: porComuna.map((f) => ({
        comuna: f.comuna,
        nuevos: Number(f.nuevos),
        por_asignar: Number(f.por_asignar),
        en_proceso: Number(f.en_proceso),
        cerrados: Number(f.cerrados),
      })),
      por_color: porColor.map((f) => ({
        color: f.color,
        total: Number(f.total),
      })),
    };
  }

  async discrepancias() {
    const columnas = await this.dataSource.query<{ COLUMN_NAME: string }[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'formularios_ais'
         AND COLUMN_NAME IN ('habitabilidad_sugerida', 'motivo_discrepancia', 'firmado_por')`,
    );
    const nombres = new Set(columnas.map((c) => c.COLUMN_NAME));
    if (!nombres.has('habitabilidad_sugerida') || !nombres.has('motivo_discrepancia')) {
      return { discrepancias: [] };
    }

    const discrepancias = await this.dataSource.query(`
      SELECT r.consecutivo, r.direccion, r.barrio, f.uuid AS formulario_uuid,
             f.habitabilidad_sugerida AS sugerida,
             f.habitabilidad_final AS final,
             f.motivo_discrepancia, f.firmado_en,
             u.nombre AS firmado_por_nombre, u.matricula
      FROM formularios_ais f
      INNER JOIN reportes r ON r.id = f.reporte_id
      LEFT JOIN usuarios u ON u.id = f.firmado_por
      WHERE f.estado = ?
        AND f.habitabilidad_final IS NOT NULL
        AND f.habitabilidad_sugerida IS NOT NULL
        AND f.habitabilidad_final <> f.habitabilidad_sugerida
      ORDER BY f.firmado_en DESC
    `, [EstadoFormulario.FIRMADO]);

    return { discrepancias };
  }

  async vencimientos() {
    const asignaciones = await this.dataSource.query(`
      SELECT r.consecutivo, r.direccion, a.vence_en,
             (a.vence_en < NOW()) AS vencida,
             u.nombre AS ingeniero, a.nivel_ingenieria AS nivel
      FROM asignaciones a
      INNER JOIN reportes r ON r.id = a.reporte_id
      INNER JOIN usuarios u ON u.id = a.ingeniero_id
      WHERE a.cerrada_en IS NULL AND a.liberada_en IS NULL
      ORDER BY a.vence_en ASC
    `);

    return {
      asignaciones: asignaciones.map((a: Record<string, unknown>) => ({
        ...a,
        vencida: Boolean(a.vencida),
      })),
    };
  }

  async exportarCsv(desde: string, hasta: string): Promise<string> {
    const filas = await this.dataSource.query(
      `
      SELECT r.consecutivo, r.estado, r.direccion, r.barrio, r.comuna,
             r.lat, r.lng, r.tipo_edificacion, r.pisos_declarados,
             r.unidades_declaradas, r.habitada, r.uso_declarado, r.requiere_nivel_a,
             r.creado_en, r.validado_en,
             f.habitabilidad_final AS color_final, f.firmado_en
      FROM reportes r
      LEFT JOIN formularios_ais f ON f.reporte_id = r.id AND f.estado = ?
      WHERE r.creado_en >= ? AND r.creado_en < DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY r.creado_en
    `,
      [EstadoFormulario.FIRMADO, desde, hasta],
    );

    const columnas = filas.length ? Object.keys(filas[0]) : ['sin_datos'];
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    return `\uFEFF${[
      columnas.join(','),
      ...filas.map((f: Record<string, unknown>) => columnas.map((c) => esc(f[c])).join(',')),
    ].join('\n')}`;
  }
}
