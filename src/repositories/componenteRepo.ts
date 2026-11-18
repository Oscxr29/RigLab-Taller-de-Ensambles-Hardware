import {
  ESTADOS_VALIDOS,
  validarComponente,
  type CategoriaComponente,
  type Componente,
  type ComponenteInput,
  type EstadoComponente,
} from '../models/Componente';
import { guardarBaseDeDatos, obtenerDB } from '../services/database';

export type CriterioOrden = 'recientes' | 'precio_desc' | 'consumo_desc' | 'nombre_asc';

export interface FiltrosConsulta {
  busqueda: string;
  categoria: string;
  estado: string;
  orden: CriterioOrden;
}

export interface TelemetriaTaller {
  totalComponentes: number;
  consumoTotalWatts: number;
  psuRecomendadaWatts: number;
  inversionTotal: number;
  totalFallas: number;
  totalEnPrueba: number;
}

/**
 * READ: Consulta componentes aplicando filtros dinámicos con parámetros SQL seguros.
 */
export function listarComponentes(filtros: FiltrosConsulta): Componente[] {
  const db = obtenerDB();

  const condiciones: string[] = [];
  const parametros: (string | number)[] = [];

  const textoBusqueda = filtros.busqueda.trim();
  if (textoBusqueda.length > 0) {
    condiciones.push('(nombre LIKE ? OR notas LIKE ?)');
    const patron = `%${textoBusqueda}%`;
    parametros.push(patron, patron);
  }

  if (filtros.categoria && filtros.categoria !== 'Todas') {
    condiciones.push('categoria = ?');
    parametros.push(filtros.categoria);
  }

  if (filtros.estado && filtros.estado !== 'Todos') {
    condiciones.push('estado = ?');
    parametros.push(filtros.estado);
  }

  const clausulaWhere = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  let clausulaOrderBy = 'ORDER BY id DESC';
  switch (filtros.orden) {
    case 'precio_desc':
      clausulaOrderBy = 'ORDER BY precio DESC, id DESC';
      break;
    case 'consumo_desc':
      clausulaOrderBy = 'ORDER BY consumo DESC, id DESC';
      break;
    case 'nombre_asc':
      clausulaOrderBy = 'ORDER BY nombre ASC';
      break;
    default:
      clausulaOrderBy = 'ORDER BY id DESC';
  }

  const sql = `
    SELECT id, nombre, categoria, consumo, precio, estado, notas
    FROM componentes
    ${clausulaWhere}
    ${clausulaOrderBy};
  `;

  const stmt = db.prepare(sql);
  stmt.bind(parametros);

  const lista: Componente[] = [];
  while (stmt.step()) {
    const fila = stmt.getAsObject();
    lista.push({
      id: Number(fila.id),
      nombre: String(fila.nombre),
      categoria: String(fila.categoria) as CategoriaComponente,
      consumo: Number(fila.consumo),
      precio: Number(fila.precio),
      estado: String(fila.estado) as EstadoComponente,
      notas: fila.notas ? String(fila.notas) : '',
    });
  }
  stmt.free();

  return lista;
}

/**
 * READ (por ID): Obtiene un único componente para cargarlo en el formulario de edición.
 */
export function obtenerComponentePorId(id: number): Componente | null {
  const db = obtenerDB();
  const stmt = db.prepare(`
    SELECT id, nombre, categoria, consumo, precio, estado, notas
    FROM componentes
    WHERE id = ?;
  `);
  stmt.bind([id]);

  let componente: Componente | null = null;
  if (stmt.step()) {
    const fila = stmt.getAsObject();
    componente = {
      id: Number(fila.id),
      nombre: String(fila.nombre),
      categoria: String(fila.categoria) as CategoriaComponente,
      consumo: Number(fila.consumo),
      precio: Number(fila.precio),
      estado: String(fila.estado) as EstadoComponente,
      notas: fila.notas ? String(fila.notas) : '',
    };
  }
  stmt.free();

  return componente;
}

/**
 * CREATE: Valida e inserta un nuevo registro en SQLite y persiste en localStorage.
 */
export function crearComponente(input: ComponenteInput): { ok: boolean; errores: string[] } {
  const validacion = validarComponente(input);
  if (!validacion.valido || !validacion.datosLimpios) {
    return { ok: false, errores: validacion.errores };
  }

  const db = obtenerDB();
  const { nombre, categoria, consumo, precio, estado, notas } = validacion.datosLimpios;

  try {
    db.run(
      `INSERT INTO componentes (nombre, categoria, consumo, precio, estado, notas)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [nombre, categoria, consumo, precio, estado, notas]
    );
    guardarBaseDeDatos();
    return { ok: true, errores: [] };
  } catch (error) {
    console.error('Error en INSERT:', error);
    return {
      ok: false,
      errores: ['No se pudo guardar el componente en la base de datos SQLite.'],
    };
  }
}

/**
 * UPDATE: Actualiza un registro existente identificado por su ID.
 */
export function actualizarComponente(
  id: number,
  input: ComponenteInput
): { ok: boolean; errores: string[] } {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, errores: ['Identificador de componente inválido.'] };
  }

  const validacion = validarComponente(input);
  if (!validacion.valido || !validacion.datosLimpios) {
    return { ok: false, errores: validacion.errores };
  }

  const db = obtenerDB();
  const { nombre, categoria, consumo, precio, estado, notas } = validacion.datosLimpios;

  try {
    db.run(
      `UPDATE componentes
       SET nombre = ?, categoria = ?, consumo = ?, precio = ?, estado = ?, notas = ?
       WHERE id = ?;`,
      [nombre, categoria, consumo, precio, estado, notas, id]
    );
    guardarBaseDeDatos();
    return { ok: true, errores: [] };
  } catch (error) {
    console.error('Error en UPDATE:', error);
    return {
      ok: false,
      errores: ['No se pudo actualizar el componente en SQLite.'],
    };
  }
}

/**
 * UPDATE puntual: Cambia rápidamente el estado de diagnóstico de un componente.
 */
export function cambiarEstadoRapido(
  id: number,
  nuevoEstado: EstadoComponente
): { ok: boolean; error?: string } {
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return { ok: false, error: 'Estado de diagnóstico no permitido.' };
  }

  const db = obtenerDB();
  try {
    db.run('UPDATE componentes SET estado = ? WHERE id = ?;', [nuevoEstado, id]);
    guardarBaseDeDatos();
    return { ok: true };
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    return { ok: false, error: 'No se pudo actualizar el estado del componente.' };
  }
}

/**
 * DELETE: Elimina un componente de SQLite por su ID y actualiza localStorage.
 */
export function eliminarComponente(id: number): { ok: boolean; error?: string } {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: 'ID inválido para eliminar.' };
  }

  const db = obtenerDB();
  try {
    db.run('DELETE FROM componentes WHERE id = ?;', [id]);
    guardarBaseDeDatos();
    return { ok: true };
  } catch (error) {
    console.error('Error en DELETE:', error);
    return { ok: false, error: 'Error al eliminar el registro de SQLite.' };
  }
}

/**
 * READ (Agregación SQL): Calcula métricas globales del taller directamente desde SQLite.
 */
export function obtenerTelemetria(): TelemetriaTaller {
  const db = obtenerDB();
  const stmt = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(consumo), 0) AS consumoTotal,
      COALESCE(SUM(precio), 0) AS inversionTotal,
      COALESCE(SUM(CASE WHEN estado = 'Falla' THEN 1 ELSE 0 END), 0) AS totalFallas,
      COALESCE(SUM(CASE WHEN estado = 'En Prueba' THEN 1 ELSE 0 END), 0) AS totalEnPrueba
    FROM componentes;
  `);

  let telemetria: TelemetriaTaller = {
    totalComponentes: 0,
    consumoTotalWatts: 0,
    psuRecomendadaWatts: 0,
    inversionTotal: 0,
    totalFallas: 0,
    totalEnPrueba: 0,
  };

  if (stmt.step()) {
    const fila = stmt.getAsObject();
    const consumoTotal = Number(fila.consumoTotal) || 0;
    // Margen del 25% redondeado al múltiplo de 50W superior para sugerir fuente de poder
    const psuRecomendada =
      consumoTotal > 0 ? Math.ceil((consumoTotal * 1.25) / 50) * 50 : 0;

    telemetria = {
      totalComponentes: Number(fila.total) || 0,
      consumoTotalWatts: consumoTotal,
      psuRecomendadaWatts: psuRecomendada,
      inversionTotal: Number(fila.inversionTotal) || 0,
      totalFallas: Number(fila.totalFallas) || 0,
      totalEnPrueba: Number(fila.totalEnPrueba) || 0,
    };
  }
  stmt.free();

  return telemetria;
}