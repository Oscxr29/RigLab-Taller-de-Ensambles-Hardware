export const CATEGORIAS_VALIDAS = [
  'GPU',
  'CPU',
  'RAM',
  'Almacenamiento',
  'Placa Base',
  'Placa Madre',
  'Fuente (PSU)',
  'Enfriamiento',
  'Gabinete',
  'Ensamble Completo',
] as const;

export const ESTADOS_VALIDOS = ['Estable', 'En Prueba', 'Falla'] as const;

export type CategoriaComponente = (typeof CATEGORIAS_VALIDAS)[number];
export type EstadoComponente = (typeof ESTADOS_VALIDOS)[number];

export interface Componente {
  id: number;
  nombre: string;
  categoria: CategoriaComponente;
  consumo: number;
  precio: number;
  estado: EstadoComponente;
  notas: string;
}

export interface ComponenteInput {
  nombre: string;
  categoria: string;
  consumo: number;
  precio: number;
  estado: string;
  notas: string;
}

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
  datosLimpios?: {
    nombre: string;
    categoria: CategoriaComponente;
    consumo: number;
    precio: number;
    estado: EstadoComponente;
    notas: string;
  };
}

export function validarComponente(input: ComponenteInput): ResultadoValidacion {
  const errores: string[] = [];

  const nombreLimpio = input.nombre.trim();
  const notasLimpias = input.notas.trim();

  if (nombreLimpio.length < 3 || nombreLimpio.length > 80) {
    errores.push('El nombre debe tener entre 3 y 80 caracteres.');
  }

  if (!CATEGORIAS_VALIDAS.includes(input.categoria as CategoriaComponente)) {
    errores.push('Selecciona una categoría válida de la lista.');
  }

  if (!Number.isInteger(input.consumo) || input.consumo < 0 || input.consumo > 3000) {
    errores.push('El consumo en Watts debe ser un número entero entre 0 y 3000.');
  }

  if (typeof input.precio !== 'number' || Number.isNaN(input.precio) || input.precio < 0) {
    errores.push('El precio debe ser un valor numérico igual o mayor a $0.00.');
  }

  if (!ESTADOS_VALIDOS.includes(input.estado as EstadoComponente)) {
    errores.push('El estado seleccionado no es válido.');
  }

  if (notasLimpias.length > 250) {
    errores.push('Las notas no pueden superar los 250 caracteres.');
  }

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  return {
    valido: true,
    errores: [],
    datosLimpios: {
      nombre: nombreLimpio,
      categoria: input.categoria as CategoriaComponente,
      consumo: input.consumo,
      precio: Number(input.precio.toFixed(2)),
      estado: input.estado as EstadoComponente,
      notas: notasLimpias,
    },
  };
}