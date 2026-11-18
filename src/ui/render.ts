import {
  CATEGORIAS_VALIDAS,
  ESTADOS_VALIDOS,
  type Componente,
  type EstadoComponente,
} from '../models/Componente';
import type { FiltrosConsulta, TelemetriaTaller } from '../repositories/componenteRepo';

export interface EstadoUI {
  componentes: Componente[];
  telemetria: TelemetriaTaller;
  filtros: FiltrosConsulta;
  componenteEditando: Componente | null;
  mensajeFeedback: {
    tipo: 'exito' | 'error' | 'info';
    textos: string[];
  } | null;
}

/**
 * Escapa caracteres especiales HTML para evitar inyección de código en la vista.
 */
function escaparHTML(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function obtenerClaseEstado(estado: EstadoComponente): string {
  switch (estado) {
    case 'Estable':
      return 'badge-estable';
    case 'En Prueba':
      return 'badge-prueba';
    case 'Falla':
      return 'badge-falla';
  }
}

export function renderizarAplicacion(contenedor: HTMLElement, estado: EstadoUI): void {
  const { componentes, telemetria, filtros, componenteEditando, mensajeFeedback } = estado;
  const esEdicion = componenteEditando !== null;

  // Porcentaje real de carga respecto a la PSU recomendada calculada desde SQLite
  const porcentajeCargaPsu =
    telemetria.psuRecomendadaWatts > 0
      ? Math.min(
          100,
          Math.round((telemetria.consumoTotalWatts / telemetria.psuRecomendadaWatts) * 100)
        )
      : 0;

  const opcionesCategoriasForm = CATEGORIAS_VALIDAS.map((cat) => {
    const selected = componenteEditando?.categoria === cat ? 'selected' : '';
    return `<option value="${cat}" ${selected}>${cat}</option>`;
  }).join('');

  const opcionesEstadosForm = ESTADOS_VALIDOS.map((est) => {
    const selected = (componenteEditando?.estado ?? 'Estable') === est ? 'selected' : '';
    return `<option value="${est}" ${selected}>${est}</option>`;
  }).join('');

  const opcionesFiltroCategoria = ['Todas', ...CATEGORIAS_VALIDAS]
    .map((cat) => {
      const selected = filtros.categoria === cat ? 'selected' : '';
      return `<option value="${cat}" ${selected}>${cat === 'Todas' ? 'Categoría: Todas' : cat}</option>`;
    })
    .join('');

  const opcionesFiltroEstado = ['Todos', ...ESTADOS_VALIDOS]
    .map((est) => {
      const selected = filtros.estado === est ? 'selected' : '';
      return `<option value="${est}" ${selected}>${est === 'Todos' ? 'Estado: Todos' : est}</option>`;
    })
    .join('');

  const bloqueFeedback = mensajeFeedback
    ? `
      <div class="alerta alerta-${mensajeFeedback.tipo}" role="alert" aria-live="polite">
        <div class="alerta-contenido">
          ${mensajeFeedback.textos.map((msg) => `<p>${escaparHTML(msg)}</p>`).join('')}
        </div>
        <button type="button" class="btn-cerrar-alerta" id="btn-cerrar-alerta" aria-label="Cerrar notificación">×</button>
      </div>
    `
    : '';

  const tarjetasHTML =
    componentes.length > 0
      ? componentes
          .map(
            (comp) => `
          <article class="card-componente estado-borde-${comp.estado.toLowerCase().replace(/\s+/g, '-')}" data-id="${comp.id}">
            <div class="card-header">
              <div class="card-titulos">
                <span class="chip-categoria">${escaparHTML(comp.categoria)}</span>
                <h3 class="card-titulo">${escaparHTML(comp.nombre)}</h3>
              </div>
              <span class="badge-estado ${obtenerClaseEstado(comp.estado)}">
                ${escaparHTML(comp.estado)}
              </span>
            </div>

            <div class="card-metricas">
              <div class="metrica-item">
                <span class="metrica-label">CONSUMO</span>
                <strong class="metrica-valor valor-cyan">${comp.consumo} W</strong>
              </div>
              <div class="metrica-item">
                <span class="metrica-label">VALOR</span>
                <strong class="metrica-valor">$${comp.precio.toFixed(2)}</strong>
              </div>
            </div>

            <p class="card-notas ${comp.notas ? '' : 'card-notas-vacia'}">
              ${comp.notas ? escaparHTML(comp.notas) : 'Sin observaciones técnicas registradas.'}
            </p>

            <div class="card-footer">
              <label class="cambio-rapido-label">
                <span class="sr-only">Cambiar estado de ${escaparHTML(comp.nombre)}</span>
                <select class="select-estado-rapido" data-id="${comp.id}">
                  ${ESTADOS_VALIDOS.map(
                    (est) =>
                      `<option value="${est}" ${comp.estado === est ? 'selected' : ''}>${est}</option>`
                  ).join('')}
                </select>
              </label>

              <div class="card-acciones">
                <button
                  type="button"
                  class="btn-accion btn-editar"
                  data-id="${comp.id}"
                  title="Editar componente"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="btn-accion btn-eliminar"
                  data-id="${comp.id}"
                  data-nombre="${escaparHTML(comp.nombre)}"
                  title="Eliminar componente"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </article>
        `
          )
          .join('')
      : `
        <div class="estado-vacio">
          <h3>Sin registros en pantalla</h3>
          <p>No hay componentes que coincidan con la búsqueda actual o el banco de pruebas está vacío.</p>
        </div>
      `;

  contenedor.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-marca">
          <div class="logo-badge" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" rx="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <line x1="9" y1="1" x2="9" y2="4"></line>
              <line x1="15" y1="1" x2="15" y2="4"></line>
              <line x1="9" y1="20" x2="9" y2="23"></line>
              <line x1="15" y1="20" x2="15" y2="23"></line>
              <line x1="20" y1="9" x2="23" y2="9"></line>
              <line x1="20" y1="14" x2="23" y2="14"></line>
              <line x1="1" y1="9" x2="4" y2="9"></line>
              <line x1="1" y1="14" x2="4" y2="14"></line>
            </svg>
          </div>
          <div>
            <div class="marca-fila">
              <h1>RigLab</h1>
              <span class="separador-marca">|</span>
              <span class="subtitulo-marca">Taller de Ensambles &amp; Hardware</span>
            </div>
            <div class="estado-db-pill">
              <span class="punto-activo" aria-hidden="true"></span>
              <span>SQLite Engine · Persistencia Local</span>
            </div>
          </div>
        </div>

        <button type="button" id="btn-reiniciar-taller" class="btn-secundario">
          Restaurar Demo
        </button>
      </header>

      <section class="panel-telemetria" aria-label="Telemetría del banco de pruebas">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-titulo">UNIDADES EN BANCO</span>
            <span class="kpi-tag">SQL COUNT</span>
          </div>
          <strong class="kpi-dato">${telemetria.totalComponentes}</strong>
          <div class="kpi-subdatos">
            <span class="tag-mini-prueba">${telemetria.totalEnPrueba} en prueba</span>
            <span class="tag-mini-falla">${telemetria.totalFallas} falla(s)</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-titulo">CARGA TÉRMICA / ENERGÍA</span>
            <span class="kpi-tag">${porcentajeCargaPsu}% PSU</span>
          </div>
          <strong class="kpi-dato valor-cyan">${telemetria.consumoTotalWatts} W</strong>
          <div class="barra-progreso" aria-hidden="true">
            <div class="barra-progreso-fill" style="width: ${porcentajeCargaPsu}%"></div>
          </div>
          <span class="kpi-detalle">PSU recomendada (+25%): <strong>${telemetria.psuRecomendadaWatts} W</strong></span>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-titulo">PRESUPUESTO DEL RIG</span>
            <span class="kpi-tag">USD</span>
          </div>
          <strong class="kpi-dato">$${telemetria.inversionTotal.toFixed(2)}</strong>
          <span class="kpi-detalle">Suma total de componentes activos</span>
        </div>
      </section>

      ${bloqueFeedback}

      <main class="layout-principal">
        <section class="panel-formulario" aria-labelledby="titulo-formulario">
          <div class="panel-cabecera">
            <span class="panel-indicador" aria-hidden="true"></span>
            <h2 id="titulo-formulario">
              ${esEdicion ? `EDITAR: ${escaparHTML(componenteEditando.nombre)}` : 'REGISTRAR COMPONENTE'}
            </h2>
          </div>

          <form id="form-componente" novalidate>
            <div class="campo-grupo">
              <label for="input-nombre">Nombre del Componente o Rig *</label>
              <input
                type="text"
                id="input-nombre"
                name="nombre"
                placeholder="Ej. NVIDIA RTX 4070 Super"
                maxlength="80"
                required
                value="${esEdicion ? escaparHTML(componenteEditando.nombre) : ''}"
              />
            </div>

            <div class="campo-grupo">
              <label for="select-categoria">Categoría *</label>
              <select id="select-categoria" name="categoria" required>
                ${opcionesCategoriasForm}
              </select>
            </div>

            <div class="campos-dobles">
              <div class="campo-grupo">
                <label for="input-consumo">Consumo (Watts) *</label>
                <input
                  type="number"
                  id="input-consumo"
                  name="consumo"
                  min="0"
                  max="3000"
                  step="1"
                  placeholder="220"
                  required
                  value="${esEdicion ? componenteEditando.consumo : ''}"
                />
              </div>

              <div class="campo-grupo">
                <label for="input-precio">Precio ($ USD) *</label>
                <input
                  type="number"
                  id="input-precio"
                  name="precio"
                  min="0"
                  step="0.01"
                  placeholder="599.99"
                  required
                  value="${esEdicion ? componenteEditando.precio : ''}"
                />
              </div>
            </div>

            <div class="campo-grupo">
              <label for="select-estado">Estado de Diagnóstico *</label>
              <select id="select-estado" name="estado" required>
                ${opcionesEstadosForm}
              </select>
            </div>

            <div class="campo-grupo">
              <label for="input-notas">Notas Técnicas / Observaciones</label>
              <textarea
                id="input-notas"
                name="notas"
                rows="3"
                maxlength="250"
                placeholder="Ej. Curva de voltaje estable, temperaturas bajo estrés..."
              >${esEdicion ? escaparHTML(componenteEditando.notas) : ''}</textarea>
            </div>

            <div class="form-botones">
              <button type="submit" class="btn-primario">
                ${esEdicion ? 'Guardar Cambios' : 'Registrar en Taller'}
              </button>
              ${
                esEdicion
                  ? `<button type="button" id="btn-cancelar-edicion" class="btn-secundario">Cancelar</button>`
                  : ''
              }
            </div>
          </form>
        </section>

        <section class="panel-inventario" aria-labelledby="titulo-inventario">
          <div class="inventario-cabecera">
            <div class="panel-cabecera">
              <span class="panel-indicador" aria-hidden="true"></span>
              <h2 id="titulo-inventario">TELEMETRÍA &amp; INVENTARIO</h2>
            </div>
            <span class="contador-resultados">${componentes.length} registro(s)</span>
          </div>

          <div class="barra-filtros">
            <div class="filtro-busqueda">
              <label for="input-busqueda" class="sr-only">Buscar por nombre o notas</label>
              <input
                type="search"
                id="input-busqueda"
                placeholder="Filtrar por hardware o nota técnica..."
                value="${escaparHTML(filtros.busqueda)}"
              />
            </div>

            <div class="filtros-selectores">
              <label for="filtro-categoria" class="sr-only">Filtrar por categoría</label>
              <select id="filtro-categoria">
                ${opcionesFiltroCategoria}
              </select>

              <label for="filtro-estado" class="sr-only">Filtrar por estado</label>
              <select id="filtro-estado">
                ${opcionesFiltroEstado}
              </select>

              <label for="filtro-orden" class="sr-only">Ordenar resultados</label>
              <select id="filtro-orden">
                <option value="recientes" ${filtros.orden === 'recientes' ? 'selected' : ''}>Orden: Recientes</option>
                <option value="precio_desc" ${filtros.orden === 'precio_desc' ? 'selected' : ''}>Orden: Mayor Precio</option>
                <option value="consumo_desc" ${filtros.orden === 'consumo_desc' ? 'selected' : ''}>Orden: Mayor Consumo</option>
                <option value="nombre_asc" ${filtros.orden === 'nombre_asc' ? 'selected' : ''}>Orden: A - Z</option>
              </select>
            </div>
          </div>

          <div class="grid-componentes">
            ${tarjetasHTML}
          </div>
        </section>
      </main>
    </div>
  `;
}