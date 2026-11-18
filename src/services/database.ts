import initSqlJs, { type Database } from 'sql.js';

const STORAGE_KEY = 'riglab_sqlite_db_v1';

let dbInstance: Database | null = null;

export interface ConsultaSQLRegistrada {
  sql: string;
  fecha: string;
  operacion: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'PRAGMA' | 'SQL';
}

const consultasRegistradas: ConsultaSQLRegistrada[] = [];

/** Registra consultas técnicas conservando únicamente las últimas seis. */
export function registrarConsultaSQL(sql: string): void {
  const normalizada = sql.trim().replace(/\s+/g, ' ');
  const primera = normalizada.split(' ')[0].toUpperCase();
  const operacion =
    primera === 'SELECT' || primera === 'INSERT' || primera === 'UPDATE' ||
    primera === 'DELETE' || primera === 'CREATE' || primera === 'PRAGMA'
      ? primera
      : 'SQL';

  consultasRegistradas.push({
    sql: normalizada,
    fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    operacion,
  });
  if (consultasRegistradas.length > 6) consultasRegistradas.shift();
}

/** Devuelve una copia estable de las consultas SQL recientes. */
export function obtenerConsultasSQL(): ConsultaSQLRegistrada[] {
  return [...consultasRegistradas];
}

/**
 * Convierte un Uint8Array (archivo SQLite binario) a cadena Base64 para localStorage.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convierte una cadena Base64 almacenada en localStorage de vuelta a Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Crea la tabla principal con sus restricciones SQL.
 */
function crearEsquema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS componentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      consumo INTEGER NOT NULL CHECK (consumo >= 0),
      precio REAL NOT NULL CHECK (precio >= 0),
      estado TEXT NOT NULL DEFAULT 'Estable',
      notas TEXT
    );
  `);
}

/**
 * Inserta registros iniciales de demostración cuando la base de datos está vacía.
 */
function insertarDatosIniciales(db: Database): void {
  registrarConsultaSQL('INSERT INTO componentes (nombre, categoria, consumo, precio, estado, notas) VALUES (?, ?, ?, ?, ?, ?);');
  const stmt = db.prepare(`
    INSERT INTO componentes (nombre, categoria, consumo, precio, estado, notas)
    VALUES (?, ?, ?, ?, ?, ?);
  `);

  const semillas: Array<[string, string, number, number, string, string]> = [
    [
      'NVIDIA GeForce RTX 4070 Super',
      'GPU',
      220,
      599.99,
      'Estable',
      'Gama alta. Curva de ventiladores ajustada, máxima 67°C bajo carga.',
    ],
    [
      'AMD Radeon RX 7600 XT 16GB',
      'GPU',
      190,
      329.99,
      'Estable',
      'Gama media. Undervolt estable a 1080mV en pruebas de estrés.',
    ],
    [
      'AMD Ryzen 7 7800X3D',
      'CPU',
      120,
      389.0,
      'Estable',
      'Gama alta. PBO con Curve Optimizer -20 en todos los núcleos.',
    ],
    [
      'Intel Core i5-13400F',
      'CPU',
      65,
      185.5,
      'En Prueba',
      'Gama media. Verificando temperaturas con disipador de stock.',
    ],
    [
      'ASUS ROG Strix B650-A WiFi',
      'Placa Madre',
      50,
      219.99,
      'Estable',
      'BIOS 2409. Perfil EXPO activo y VRM a 48°C.',
    ],
    [
      'Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz',
      'RAM',
      10,
      114.5,
      'En Prueba',
      'Validando estabilidad de perfil EXPO en MemTest86.',
    ],
    [
      'Kingston Fury Beast DDR4 16GB (2x8GB) 3200MHz',
      'RAM',
      8,
      44.99,
      'Estable',
      'Kit económico probado para ensambles de entrada.',
    ],
    [
      'Samsung 990 Pro NVMe 2TB',
      'Almacenamiento',
      8,
      169.99,
      'Estable',
      'Firmware actualizado. 42°C con disipador pasivo.',
    ],
    [
      'NZXT Kraken 240 RGB',
      'Enfriamiento',
      15,
      139.99,
      'Estable',
      'Bomba fijada al 80% y curva PWM silenciosa.',
    ],
    [
      'MSI MPG A850G PCIE5 850W Gold',
      'Fuente (PSU)',
      20,
      134.99,
      'Estable',
      'Conector nativo 12VHPWR verificado sin caídas de tensión.',
    ],
    [
      'Fuente Modular 650W Bronze (Unidad Antigua)',
      'Fuente (PSU)',
      15,
      65.0,
      'Falla',
      'Presenta coil whine intenso y caída de voltaje en riel de 12V.',
    ],
    [
      'Lian Li LANCOOL 216',
      'Gabinete',
      0,
      99.99,
      'Estable',
      'Flujo de aire optimizado con ventiladores frontales de 160mm.',
    ],
  ];

  for (const fila of semillas) {
    stmt.run(fila);
  }
  stmt.free();
}

/**
 * Exporta el estado actual de la base de datos SQLite y lo guarda en localStorage.
 */
export function guardarBaseDeDatos(): void {
  if (!dbInstance) return;

  try {
    const data = dbInstance.export();
    const base64 = uint8ArrayToBase64(data);
    window.localStorage.setItem(STORAGE_KEY, base64);
  } catch (error) {
    console.error('Error al guardar la base de datos en localStorage:', error);
    throw new Error(
      'No se pudieron guardar los cambios en el almacenamiento local del navegador.'
    );
  }
}

/**
 * Inicializa SQL.js, recupera la base de datos desde localStorage o crea una nueva.
 */
export async function inicializarBaseDeDatos(): Promise<{
  db: Database;
  advertenciaRecuperacion: string | null;
}> {
  if (dbInstance) {
    return { db: dbInstance, advertenciaRecuperacion: null };
  }

  let advertenciaRecuperacion: string | null = null;

  try {
    const SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });

    const datosGuardados = window.localStorage.getItem(STORAGE_KEY);

    if (datosGuardados) {
      try {
        const bytes = base64ToUint8Array(datosGuardados);
        dbInstance = new SQL.Database(bytes);
        // Verificación rápida de integridad de tabla
        crearEsquema(dbInstance);
      } catch (errorCorrupcion) {
        console.warn('Datos dañados en localStorage, reconstruyendo BD:', errorCorrupcion);
        window.localStorage.removeItem(STORAGE_KEY);
        dbInstance = new SQL.Database();
        crearEsquema(dbInstance);
        insertarDatosIniciales(dbInstance);
        guardarBaseDeDatos();
        advertenciaRecuperacion =
          'Se detectaron datos locales dañados y se restauró una base de datos limpia.';
      }
    } else {
      dbInstance = new SQL.Database();
      crearEsquema(dbInstance);
      insertarDatosIniciales(dbInstance);
      guardarBaseDeDatos();
    }

    return { db: dbInstance, advertenciaRecuperacion };
  } catch (error) {
    console.error('Error crítico al inicializar SQL.js:', error);
    throw new Error(
      'No se pudo iniciar el motor SQLite (SQL.js). Verifica que sql-wasm.wasm esté disponible.'
    );
  }
}

/**
 * Devuelve la instancia activa de la base de datos.
 */
export function obtenerDB(): Database {
  if (!dbInstance) {
    throw new Error('La base de datos SQLite aún no ha sido inicializada.');
  }
  return dbInstance;
}

/** Valida e instala un archivo SQLite externo como base activa. */
export async function importarBaseDeDatos(bytes: Uint8Array): Promise<{ ok: boolean; error?: string }> {
  try {
    const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
    const candidata = new SQL.Database(bytes);

    registrarConsultaSQL("SELECT name FROM sqlite_master WHERE type='table' AND name='componentes';");
    const valida = candidata.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'componentes';
    `);
    const existeTabla = valida.step();
    valida.free();

    if (!existeTabla) {
      candidata.close();
      return { ok: false, error: 'El archivo no contiene la tabla SQLite requerida "componentes".' };
    }

    if (dbInstance) dbInstance.close();
    dbInstance = candidata;
    guardarBaseDeDatos();
    return { ok: true };
  } catch (error) {
    console.error('Error al importar respaldo SQLite:', error);
    return { ok: false, error: 'No se pudo leer el archivo como una base SQLite válida.' };
  }
}

/**
 * Borra los datos guardados en localStorage y vuelve a cargar los datos de ejemplo.
 */
export async function reiniciarTaller(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  await inicializarBaseDeDatos();
}