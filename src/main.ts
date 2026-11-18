import './styles/main.css';
import type { Componente, EstadoComponente } from './models/Componente';
import {
  actualizarComponente,
  cambiarEstadoRapido,
  crearComponente,
  eliminarComponente,
  listarComponentes,
  obtenerComponentePorId,
  obtenerTelemetria,
  type CriterioOrden,
  type FiltrosConsulta,
} from './repositories/componenteRepo';
import { inicializarBaseDeDatos, reiniciarTaller } from './services/database';
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

  renderizarAplicacion(appContainer, {
    componentes,
    telemetria,
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

  // 8. Botón Restaurar datos de ejemplo
  const btnReiniciar = document.getElementById('btn-reiniciar-taller');
  btnReiniciar?.addEventListener('click', async () => {
    const confirmado = window.confirm(
      '¿Deseas borrar tus cambios locales y restaurar los 4 componentes iniciales de demostración?'
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