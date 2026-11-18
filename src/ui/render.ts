import {
  CATEGORIAS_VALIDAS,
  ESTADOS_VALIDOS,
  type Componente,
  type EstadoComponente,
} from '../models/Componente';
import type { FiltrosConsulta, TelemetriaTaller } from '../repositories/componenteRepo';
import type {
  DiagnosticoExtremos,
  ResumenCategoria,
  ColumnaEsquema,
} from '../repositories/componenteRepo';
import type { ConsultaSQLRegistrada } from '../services/database';

export interface EstadoUI {
  componentes: Componente[];
  telemetria: TelemetriaTaller;
  resumenCategorias: ResumenCategoria[];
  diagnostico: DiagnosticoExtremos;
  esquema: ColumnaEsquema[];
  consultasSQL: ConsultaSQLRegistrada[];
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

function obtenerColorCategoria(categoria: string): string {
  const colores: Record<string, string> = {
    GPU: '#06b6d4',
    CPU: '#3b82f6',
    'Placa Madre': '#6366f1',
    RAM: '#8b5cf6',
    Almacenamiento: '#10b981',
    Enfriamiento: '#22d3ee',
    'Fuente (PSU)': '#f59e0b',
    Gabinete: '#94a3b8',
    'Ensamble Completo': '#22c55e',
  };
  return colores[categoria] ?? '#06b6d4';
}

export function renderizarAplicacion(contenedor: HTMLElement, estado: EstadoUI): void {
  const {
    componentes,
    telemetria,
    resumenCategorias,
    diagnostico,
    esquema,
    consultasSQL,
    filtros,
    componenteEditando,
    mensajeFeedback,
  } = estado;
  const esEdicion = componenteEditando !== null;

  // Porcentaje real de carga respecto a la PSU recomendada calculada desde SQLite
  const porcentajeCargaPsu =
    telemetria.psuRecomendadaWatts > 0
      ? Math.min(
          100,
          Math.round((telemetria.consumoTotalWatts / telemetria.psuRecomendadaWatts) * 100)
        )
      : 0;
  const porcentajeEstable = diagnostico.porcentajeEstable;
  const colorCarga =
    porcentajeCargaPsu > 90 ? '#f43f5e' :
    porcentajeCargaPsu >= 75 ? '#f59e0b' : '#06b6d4';
  const colorSalud =
    porcentajeEstable >= 80 ? '#10b981' :
    porcentajeEstable >= 50 ? '#f59e0b' : '#ef4444';
  const circunferencia = 276.46;
  const desplazamientoCarga = circunferencia * (1 - porcentajeCargaPsu / 100);
  const desplazamientoEstable = circunferencia * (1 - porcentajeEstable / 100);
  const consumoMaximoCategoria = resumenCategorias.reduce(
    (maximo, categoria) => Math.max(maximo, categoria.consumoTotalWatts),
    0
  );
  const distribucionCategorias = resumenCategorias
    .map((categoria) => {
      const coloresCategoria: Record<string, string> = {
        GPU: '#06b6d4',
        CPU: '#3b82f6',
        'Placa Madre': '#6366f1',
        RAM: '#8b5cf6',
        Almacenamiento: '#10b981',
        Enfriamiento: '#22d3ee',
        'Fuente (PSU)': '#f59e0b',
        Gabinete: '#94a3b8',
        'Ensamble Completo': '#22c55e',
      };
      const colorCategoria = coloresCategoria[categoria.categoria] ?? '#06b6d4';
      const ancho =
        consumoMaximoCategoria > 0
          ? Math.max(2, Math.round((categoria.consumoTotalWatts / consumoMaximoCategoria) * 100))
          : 0;
      return `
        <div class="categoria-fila">
          <div class="categoria-datos" style="--categoria-color: ${colorCategoria}">
            <span class="categoria-nombre">${escaparHTML(categoria.categoria)}</span>
            <strong>${categoria.cantidad} · ${categoria.consumoTotalWatts} W · $${categoria.inversionTotal.toFixed(2)}</strong>
          </div>
          <svg class="categoria-barra" viewBox="0 0 100 8" preserveAspectRatio="none" role="img"
            aria-label="${escaparHTML(categoria.categoria)}: ${categoria.consumoTotalWatts} Watts">
            <rect class="categoria-barra-fondo" x="0" y="1" width="100" height="6" rx="3"></rect>
            <rect class="categoria-barra-valor" x="0" y="1" width="${ancho}" height="6" rx="3" fill="${colorCategoria}" style="filter: drop-shadow(0 0 2px ${colorCategoria})"></rect>
          </svg>
        </div>
      `;
    })
    .join('');

  const opcionesCategoriasForm = CATEGORIAS_VALIDAS.map((cat) => {
    const selected = componenteEditando?.categoria === cat ? 'selected' : '';
    return `<option value="${cat}" ${selected}>${cat}</option>`;
  }).join('');

  const estadoInicialForm = componenteEditando?.estado ?? 'Estable';
  const botonesEstadoForm = ESTADOS_VALIDOS.map((est) => {
    const activo = estadoInicialForm === est ? 'activo' : '';
    const claseEstado = est === 'Estable' ? 'estable' : est === 'En Prueba' ? 'prueba' : 'falla';
    return `
      <button type="button" class="pildora-estado ${claseEstado} ${activo}" data-estado="${est}" aria-pressed="${estadoInicialForm === est}">
        ${escaparHTML(est)}
      </button>
    `;
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
                <span class="chip-categoria" style="color:${obtenerColorCategoria(comp.categoria)};border-color:${obtenerColorCategoria(comp.categoria)}">${escaparHTML(comp.categoria)}</span>
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
            <p class="descripcion-riglab">
              RigLab ofrece telemetría energética y calcula el margen recomendado de PSU.<br />
              Centraliza el inventario, controla CRUD y persiste la base SQLite localmente en el navegador.
            </p>
          </div>
        </div>

        <div class="topbar-actions">
          <button type="button" id="btn-descargar-backup" class="btn-secundario btn-backup">
            Descargar .sqlite
          </button>
          <button type="button" id="btn-importar-backup" class="btn-secundario btn-backup">
            Importar .sqlite
          </button>
          <input type="file" id="input-importar-backup" accept=".sqlite,.db" style="display:none" />
          <button type="button" id="btn-reiniciar-taller" class="btn-secundario">
            Restaurar Demo
          </button>
        </div>
      </header>

      <section class="panel-telemetria" aria-label="Telemetría del banco de pruebas">
        <div class="medidor-card">
          <div class="medidor-titulos">
            <span>CARGA DE PSU</span>
            <strong>${telemetria.consumoTotalWatts} W</strong>
          </div>
          <svg class="medidor-svg" viewBox="0 0 100 100" role="img" aria-label="Carga de PSU ${porcentajeCargaPsu}%">
            <circle class="medidor-fondo" cx="50" cy="50" r="44"></circle>
            <circle class="medidor-progreso carga" cx="50" cy="50" r="44" style="stroke:${colorCarga}"
              stroke-dasharray="${circunferencia}" stroke-dashoffset="${desplazamientoCarga}"></circle>
          </svg>
          <div class="medidor-valor">
            <strong>${porcentajeCargaPsu}%</strong>
            <span>${telemetria.psuRecomendadaWatts} W PSU</span>
          </div>
        </div>

        <div class="medidor-card">
          <div class="medidor-titulos">
            <span>SALUD DEL RIG</span>
            <strong>${diagnostico.porcentajeEstable}% ESTABLE</strong>
          </div>
          <svg class="medidor-svg" viewBox="0 0 100 100" role="img" aria-label="Salud del rig ${porcentajeEstable}% estable">
            <circle class="medidor-fondo" cx="50" cy="50" r="44"></circle>
            <circle class="medidor-progreso salud" cx="50" cy="50" r="44" style="stroke:${colorSalud}"
              stroke-dasharray="${circunferencia}" stroke-dashoffset="${desplazamientoEstable}"></circle>
          </svg>
          <div class="medidor-valor">
            <strong>${porcentajeEstable}%</strong>
            <span>${telemetria.totalComponentes} UNIDADES</span>
          </div>
        </div>

        <div class="presupuesto-card">
          <span class="kpi-titulo">PRESUPUESTO TOTAL</span>
          <strong class="presupuesto-valor">$${telemetria.inversionTotal.toFixed(2)}</strong>
          <div class="estado-contadores">
            <div><strong>${telemetria.totalComponentes}</strong><span>TOTAL</span></div>
            <div><strong class="texto-prueba">${telemetria.totalEnPrueba}</strong><span>EN PRUEBA</span></div>
            <div><strong class="texto-falla">${telemetria.totalFallas}</strong><span>FALLA</span></div>
          </div>
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

          <div class="presets-prueba" aria-label="Presets de prueba rápida">
            <span class="presets-titulo">PRESETS DE PRUEBA RAPIDA</span>
            <div class="presets-lista">
              <button type="button" class="preset-chip" data-preset="entrada">Preset 1 · Entrada</button>
              <button type="button" class="preset-chip" data-preset="media">Preset 2 · Gama Media</button>
              <button type="button" class="preset-chip" data-preset="alta">Preset 3 · Gama Alta</button>
            </div>
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
              <span class="campo-label">Estado de Diagnóstico *</span>
              <input type="hidden" id="input-estado" name="estado" value="${estadoInicialForm}" />
              <div class="pildoras-estado" role="group" aria-label="Estado de diagnóstico">
                ${botonesEstadoForm}
              </div>
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

          <section class="tarjeta-diagnostic" aria-label="Diagnóstico del taller">
            <div class="diagnostic-cabecera">
              <span>DIAGNOSTIC</span>
              <strong class="${porcentajeEstable >= 70 ? 'texto-estable' : porcentajeEstable > 0 ? 'texto-prueba' : 'texto-falla'}">
                ${porcentajeEstable >= 70 ? 'NORMAL' : porcentajeEstable > 0 ? 'REVISAR' : 'SIN DATOS'}
              </strong>
            </div>
            <div class="diagnostic-fila">
              <span>MAYOR CONSUMO</span>
              <strong>${diagnostico.mayorConsumo ? `${escaparHTML(diagnostico.mayorConsumo.nombre)} · ${diagnostico.mayorConsumo.consumo} W` : 'Sin registros'}</strong>
            </div>
            <div class="diagnostic-fila">
              <span>MAYOR COSTO</span>
              <strong>${diagnostico.mayorCosto ? `${escaparHTML(diagnostico.mayorCosto.nombre)} · $${diagnostico.mayorCosto.precio.toFixed(2)}` : 'Sin registros'}</strong>
            </div>
            <div class="diagnostic-fila">
              <span>ESTADO GENERAL</span>
              <strong>${porcentajeEstable}% unidades Estables</strong>
            </div>
            <div class="diagnostic-fila">
              <span>ALERTA DE FALLA</span>
              ${diagnostico.primeraFalla
                ? `<strong class="texto-falla">${escaparHTML(diagnostico.primeraFalla.nombre)}</strong>`
                : '<strong class="texto-estable">Ninguna detectada</strong>'}
            </div>
          </section>
        </section>

        <section class="panel-inventario" aria-labelledby="titulo-inventario">
          <div class="inventario-cabecera">
            <div class="panel-cabecera">
              <span class="panel-indicador" aria-hidden="true"></span>
              <h2 id="titulo-inventario">TELEMETRÍA &amp; INVENTARIO</h2>
            </div>
            <span class="contador-resultados">${componentes.length} registro(s)</span>
          </div>

          <section class="panel-categorias" aria-label="Distribución por categoría">
            <div class="categoria-cabecera">
              <span>DISTRIBUCIÓN POR CATEGORÍA</span>
              <span>UNIDADES · WATTS · USD</span>
            </div>
            ${distribucionCategorias || '<p class="categoria-vacia">Sin datos agregados.</p>'}
          </section>

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

      <details class="sql-inspector">
        <summary>⚙️ SQLite Engine Inspector &amp; Schema</summary>
        <div class="sql-inspector-contenido">
          <section class="sql-schema" aria-label="Esquema de componentes">
            <h3>PRAGMA table_info(componentes)</h3>
            <div class="schema-tabla">
              ${esquema.map((columna) => `
                <div class="schema-fila">
                  <code>${escaparHTML(columna.nombre)}</code>
                  <span>${escaparHTML(columna.tipo)}</span>
                  <span>${columna.clavePrimaria ? 'PK' : columna.noNulo ? 'NOT NULL' : 'NULL'}</span>
                </div>
              `).join('')}
            </div>
          </section>
          <section class="sql-log" aria-label="Consultas SQL recientes">
            <h3>ÚLTIMAS 6 CONSULTAS</h3>
            ${consultasSQL.length
              ? consultasSQL.slice().reverse().map((consulta) => `
                  <div class="sql-log-fila">
                    <time>${escaparHTML(consulta.fecha)}</time>
                    <span class="sql-operacion sql-${consulta.operacion.toLowerCase()}">${escaparHTML(consulta.operacion)}</span>
                    <code>${escaparHTML(consulta.sql)}</code>
                  </div>
                `).join('')
              : '<p class="sql-vacio">Sin consultas registradas.</p>'}
          </section>
        </div>
      </details>
    </div>
  `;
}