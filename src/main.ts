import './styles/main.css';
import type { Componente, EstadoComponente } from './models/Componente';
import {
  actualizarComponente,
  cambiarEstadoRapido,
  crearComponente,
  eliminarComponente,
  listarComponentes,
  obtenerComponentePorId,
  obtenerDiagnosticoExtremos,
  obtenerEsquemaComponentes,
  obtenerResumenPorCategoria,
  obtenerTelemetria,
  type CriterioOrden,
  type FiltrosConsulta,
} from './repositories/componenteRepo';
import {
  inicializarBaseDeDatos,
  importarBaseDeDatos,
  obtenerDB,
  obtenerConsultasSQL,
  reiniciarTaller,
} from './services/database';
import { renderizarAplicacion, type EstadoUI } from './ui/render';

const appContainer = document.querySelector<HTMLDivElement>('#app');

if (!appContainer) {
  throw new Error('No se encontró el contenedor raíz #app en index.html');
}

const filtrosActuales: FiltrosConsulta = {
  busqueda: '',
  categoria: 'Todas',
  estado: 'Todos',
  orden: 'recientes',
};

let componenteEditando: Componente | null = null;
let mensajeFeedback: EstadoUI['mensajeFeedback'] = null;

function actualizarVista(): void {
  if (!appContainer) return;

  const componentes = listarComponentes(filtrosActuales);
  const telemetria = obtenerTelemetria();
  const resumenCategorias = obtenerResumenPorCategoria();
  const diagnostico = obtenerDiagnosticoExtremos();
  const esquema = obtenerEsquemaComponentes();
  const consultasSQL = obtenerConsultasSQL();

  renderizarAplicacion(appContainer, {
    componentes,
    telemetria,
    resumenCategorias,
    diagnostico,
    esquema,
    consultasSQL,
    filtros: filtrosActuales,
    componenteEditando,
    mensajeFeedback,
  });

  enlazarEventos();
}

function enlazarEventos(): void {
  // 1. Cerrar notificación
  const btnCerrarAlerta = document.getElementById('btn-cerrar-alerta');
  btnCerrarAlerta?.addEventListener('click', () => {
    mensajeFeedback = null;
    actualizarVista();
  });

  // 2. Formulario CREATE / UPDATE
  const form = document.getElementById('form-componente') as HTMLFormElement | null;
  form?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const formData = new FormData(form);

    const nombre = String(formData.get('nombre') ?? '');
    const categoria = String(formData.get('categoria') ?? '');
    const consumoRaw = String(formData.get('consumo') ?? '').trim();
    const precioRaw = String(formData.get('precio') ?? '').trim();
    const estado = String(formData.get('estado') ?? 'Estable');
    const notas = String(formData.get('notas') ?? '');

    const consumo = consumoRaw === '' ? NaN : Number(consumoRaw);
    const precio = precioRaw === '' ? NaN : Number(precioRaw);

    if (componenteEditando) {
      const resultado = actualizarComponente(componenteEditando.id, {
        nombre,
        categoria,
        consumo,
        precio,
        estado,
        notas,
      });

      if (!resultado.ok) {
        mensajeFeedback = { tipo: 'error', textos: resultado.errores };
        actualizarVista();
        return;
      }

      mensajeFeedback = {
        tipo: 'exito',
        textos: [`Componente "${nombre.trim()}" actualizado correctamente.`],
      };
      componenteEditando = null;
      actualizarVista();
    } else {
      const resultado = crearComponente({
        nombre,
        categoria,
        consumo,
        precio,
        estado,
        notas,
      });

      if (!resultado.ok) {
        mensajeFeedback = { tipo: 'error', textos: resultado.errores };
        actualizarVista();
        return;
      }

      mensajeFeedback = {
        tipo: 'exito',
        textos: [`Componente "${nombre.trim()}" guardado en SQLite.`],
      };
      actualizarVista();
    }
  });

  const inputEstado = document.getElementById('input-estado') as HTMLInputElement | null;
  document.querySelectorAll<HTMLButtonElement>('.pildora-estado').forEach((pildora) => {
    pildora.addEventListener('click', () => {
      const estado = pildora.dataset.estado ?? 'Estable';
      if (inputEstado) inputEstado.value = estado;
      document.querySelectorAll<HTMLButtonElement>('.pildora-estado').forEach((item) => {
        const activo = item.dataset.estado === estado;
        item.classList.toggle('activo', activo);
        item.setAttribute('aria-pressed', activo ? 'true' : 'false');
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const presets: Record<string, {
          nombre: string;
          categoria: string;
          consumo: number;
          precio: number;
          estado: EstadoComponente;
          notas: string;
        }> = {
          entrada: {
            nombre: 'Rig Oficina / Entrada Ryzen 5',
            categoria: 'Ensamble Completo',
            consumo: 140,
            precio: 480,
            estado: 'Estable',
            notas: 'Equipo base probado para tareas ligeras y ofimática.',
          },
          media: {
            nombre: 'Rig Gaming 1080p RX 7600',
            categoria: 'Ensamble Completo',
            consumo: 310,
            precio: 920,
            estado: 'En Prueba',
            notas: 'Validando flujo térmico y estabilidad en sesión continua.',
          },
          alta: {
            nombre: 'Workstation RTX 4080 Super',
            categoria: 'Ensamble Completo',
            consumo: 520,
            precio: 2150,
            estado: 'Estable',
            notas: 'Ensamble de alto rendimiento bajo prueba de carga sostenida.',
          },
        };
        const preset = presets[chip.dataset.preset ?? ''];
        if (!preset) return;

        (document.getElementById('input-nombre') as HTMLInputElement | null)?.setAttribute('value', preset.nombre);
        const inputNombre = document.getElementById('input-nombre') as HTMLInputElement | null;
        if (inputNombre) inputNombre.value = preset.nombre;
        const selectCategoria = document.getElementById('select-categoria') as HTMLSelectElement | null;
        if (selectCategoria) selectCategoria.value = preset.categoria;
        const inputConsumo = document.getElementById('input-consumo') as HTMLInputElement | null;
        if (inputConsumo) inputConsumo.value = String(preset.consumo);
        const inputPrecio = document.getElementById('input-precio') as HTMLInputElement | null;
        if (inputPrecio) inputPrecio.value = preset.precio.toFixed(2);
        const inputNotas = document.getElementById('input-notas') as HTMLTextAreaElement | null;
        if (inputNotas) inputNotas.value = preset.notas;
        if (inputEstado) inputEstado.value = preset.estado;
        document.querySelectorAll<HTMLButtonElement>('.pildora-estado').forEach((pildora) => {
          const activo = pildora.dataset.estado === preset.estado;
          pildora.classList.toggle('activo', activo);
          pildora.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });
      });
    });
  });

  // 3. Cancelar edición
  const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
  btnCancelarEdicion?.addEventListener('click', () => {
    componenteEditando = null;
    mensajeFeedback = null;
    actualizarVista();
  });

  // 4. Filtros y búsqueda en tiempo real
  const inputBusqueda = document.getElementById('input-busqueda') as HTMLInputElement | null;
  inputBusqueda?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const posicionCursor = target.selectionStart;
    filtrosActuales.busqueda = target.value;
    actualizarVista();

    const nuevoInput = document.getElementById('input-busqueda') as HTMLInputElement | null;
    if (nuevoInput) {
      nuevoInput.focus();
      if (posicionCursor !== null) {
        nuevoInput.setSelectionRange(posicionCursor, posicionCursor);
      }
    }
  });

  const filtroCategoria = document.getElementById('filtro-categoria') as HTMLSelectElement | null;
  filtroCategoria?.addEventListener('change', (e) => {
    filtrosActuales.categoria = (e.target as HTMLSelectElement).value;
    actualizarVista();
  });

  const filtroEstado = document.getElementById('filtro-estado') as HTMLSelectElement | null;
  filtroEstado?.addEventListener('change', (e) => {
    filtrosActuales.estado = (e.target as HTMLSelectElement).value;
    actualizarVista();
  });

  const filtroOrden = document.getElementById('filtro-orden') as HTMLSelectElement | null;
  filtroOrden?.addEventListener('change', (e) => {
    filtrosActuales.orden = (e.target as HTMLSelectElement).value as CriterioOrden;
    actualizarVista();
  });

  // 5. Botones Editar de cada tarjeta
  document.querySelectorAll<HTMLButtonElement>('.btn-editar').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const encontrado = obtenerComponentePorId(id);
      if (encontrado) {
        componenteEditando = encontrado;
        mensajeFeedback = {
          tipo: 'info',
          textos: [`Editando "${encontrado.nombre}". Modifica los campos y guarda los cambios.`],
        };
        actualizarVista();
        document.getElementById('input-nombre')?.focus();
      }
    });
  });

  // 6. Botones Eliminar con confirmación
  document.querySelectorAll<HTMLButtonElement>('.btn-eliminar').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const nombre = btn.dataset.nombre ?? 'este componente';

      const confirmado = window.confirm(
        `¿Seguro que deseas eliminar "${nombre}" de la base de datos SQLite? Esta acción no se puede deshacer.`
      );

      if (!confirmado) return;

      const resultado = eliminarComponente(id);
      if (!resultado.ok) {
        mensajeFeedback = {
          tipo: 'error',
          textos: [resultado.error ?? 'No se pudo eliminar el registro.'],
        };
        actualizarVista();
        return;
      }

      if (componenteEditando?.id === id) {
        componenteEditando = null;
      }

      mensajeFeedback = {
        tipo: 'exito',
        textos: [`Componente "${nombre}" eliminado correctamente.`],
      };
      actualizarVista();
    });
  });

  // 7. Cambio rápido de estado en cada tarjeta
  document.querySelectorAll<HTMLSelectElement>('.select-estado-rapido').forEach((select) => {
    select.addEventListener('change', () => {
      const id = Number(select.dataset.id);
      const nuevoEstado = select.value as EstadoComponente;
      const resultado = cambiarEstadoRapido(id, nuevoEstado);

      if (!resultado.ok) {
        mensajeFeedback = {
          tipo: 'error',
          textos: [resultado.error ?? 'Error al cambiar el estado.'],
        };
      } else {
        mensajeFeedback = {
          tipo: 'exito',
          textos: [`Estado actualizado a "${nuevoEstado}".`],
        };
      }
      actualizarVista();
    });
  });

  // Exporta una copia binaria real de la base SQLite activa.
  const btnDescargarBackup = document.getElementById('btn-descargar-backup');
  btnDescargarBackup?.addEventListener('click', () => {
    const bytes: Uint8Array = obtenerDB().export();
    const copia = new Uint8Array(bytes.byteLength);
    copia.set(bytes);
    const blob = new Blob([copia], { type: 'application/vnd.sqlite3' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'riglab_backup.sqlite';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  });

  const btnImportarBackup = document.getElementById('btn-importar-backup');
  const inputImportarBackup = document.getElementById('input-importar-backup') as HTMLInputElement | null;
  btnImportarBackup?.addEventListener('click', () => inputImportarBackup?.click());
  inputImportarBackup?.addEventListener('change', async () => {
    const archivo = inputImportarBackup.files?.[0];
    if (!archivo) return;

    try {
      const bytes = new Uint8Array(await archivo.arrayBuffer());
      const resultado = await importarBaseDeDatos(bytes);
      if (!resultado.ok) {
        mensajeFeedback = {
          tipo: 'error',
          textos: [resultado.error ?? 'El respaldo SQLite no pudo ser importado.'],
        };
      } else {
        componenteEditando = null;
        mensajeFeedback = {
          tipo: 'exito',
          textos: [`Respaldo "${archivo.name}" importado correctamente en SQLite.`],
        };
      }
    } catch {
      mensajeFeedback = {
        tipo: 'error',
        textos: ['No se pudo leer el archivo seleccionado.'],
      };
    } finally {
      inputImportarBackup.value = '';
      actualizarVista();
    }
  });

  // 8. Botón Restaurar datos de ejemplo
  const btnReiniciar = document.getElementById('btn-reiniciar-taller');
  btnReiniciar?.addEventListener('click', async () => {
    const confirmado = window.confirm(
      '¿Deseas borrar tus cambios locales y restaurar los 12 componentes iniciales de demostración?'
    );
    if (!confirmado) return;

    await reiniciarTaller();
    componenteEditando = null;
    filtrosActuales.busqueda = '';
    filtrosActuales.categoria = 'Todas';
    filtrosActuales.estado = 'Todos';
    filtrosActuales.orden = 'recientes';
    mensajeFeedback = {
      tipo: 'info',
      textos: ['Taller restaurado con los datos iniciales de ejemplo.'],
    };
    actualizarVista();
  });
}

async function iniciarAplicacion(): Promise<void> {
  try {
    const { advertenciaRecuperacion } = await inicializarBaseDeDatos();
    if (advertenciaRecuperacion) {
      mensajeFeedback = { tipo: 'info', textos: [advertenciaRecuperacion] };
    }
    actualizarVista();
  } catch (error) {
    if (appContainer) {
      appContainer.innerHTML = `
        <div class="alerta alerta-error" role="alert">
          <p><strong>Error crítico al iniciar RigLab:</strong> ${
            error instanceof Error ? error.message : 'Error desconocido'
          }</p>
        </div>
      `;
    }
  }
}

iniciarAplicacion();