# RigLab — Taller de Ensambles & Hardware

Aplicación web de gestión técnica, diagnóstico energético y control de inventario para talleres de ensamble de PC, impulsada por **SQLite en el navegador (WebAssembly)** con persistencia local y telemetría visual en tiempo real.

- **Despliegue en vivo (Vercel):** [https://rig-lab-taller-de-ensambles-hardwar.vercel.app](https://rig-lab-taller-de-ensambles-hardwar.vercel.app)
- **Repositorio oficial:** [https://github.com/Oscxr29/RigLab-Taller-de-Ensambles-Hardware](https://github.com/Oscxr29/RigLab-Taller-de-Ensambles-Hardware)

---

## Características Principales

- **Motor SQLite real en el cliente (`SQL.js`):** Ejecución de consultas SQL relacionales (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `GROUP BY`, `SUM`, `COUNT`, `PRAGMA`) directamente en memoria mediante WebAssembly.
- **Persistencia automática y respaldo portátil:**
  - Serialización binaria automática de la base de datos hacia `localStorage` (`riglab_sqlite_db_v1`) tras cada operación de escritura.
  - **Exportación e importación de archivos `.sqlite` / `.db`:** Permite descargar una copia física real de la base de datos (`riglab_backup.sqlite`) e importar respaldos validando la existencia de la tabla `componentes` en `sqlite_master`.
- **Telemetría y analítica visual en SVG:**
  - **Medidores radiales dinámicos:** Indicadores circulares con cambio cromático según umbral operativo para **Carga de PSU** (`W` totales vs. fuente recomendada con margen de seguridad del +25%) y **Salud del Rig** (`%` de unidades en estado `Estable`).
  - **Distribución por categoría (`SQL GROUP BY`):** Gráfica comparativa de consumo energético, unidades e inversión por tipo de hardware con acentos de color por categoría.
  - **Panel `DIAGNOSTIC`:** Detección automática del componente de mayor consumo, componente más costoso y alerta prioritaria de unidades en estado `Falla`.
- **Flujo ágil de taller:**
  - **Presets rápidos por gama:** Relleno automático del formulario para pruebas de entrada, gama media y gama alta (`Preset 1 · Entrada`, `Preset 2 · Gama Media`, `Preset 3 · Gama Alta`).
  - **SQLite Engine Inspector & Schema:** Panel colapsable que expone la estructura real de la tabla (`PRAGMA table_info(componentes)`) y el historial en vivo de las últimas consultas ejecutadas.
- **Seguridad y validación:**
  - Consultas 100 % parametrizadas (`?`) para prevenir inyección SQL.
  - Sanitización de salida HTML (`escaparHTML`) contra XSS.
  - Lista blanca (*whitelist*) para ordenamiento dinámico y validación estricta de rangos numéricos y longitudes en cliente.

---

## Stack Tecnológico

| Capa | Tecnología | Uso en el proyecto |
| :--- | :--- | :--- |
| **Core & Build** | Vite + TypeScript | Tipado estricto, modularización y empaquetado optimizado para producción |
| **Base de Datos** | `sql.js` (SQLite WASM) | Motor relacional SQLite ejecutado en el navegador (`/public/sql-wasm.wasm`) |
| **Persistencia** | Web Storage API (`localStorage`) + File API | Respaldo automático en Base64 y exportación/importación binaria `.sqlite` |
| **Interfaz & Gráficos** | HTML5, CSS3 Grid/Flexbox, SVG nativo | Diseño *Telemetry Cyan & Carbon* adaptable a móvil, tableta y escritorio |

---

## Esquema de Base de Datos

La base de datos inicializa automáticamente la tabla `componentes` y siembra **12 registros de referencia** cubriendo distintas gamas y categorías (`GPU`, `CPU`, `Placa Madre`, `RAM`, `Almacenamiento`, `Enfriamiento`, `Fuente (PSU)`, `Gabinete` y `Ensamble Completo`):

```sql
CREATE TABLE IF NOT EXISTS componentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  consumo INTEGER NOT NULL,
  precio REAL NOT NULL,
  estado TEXT NOT NULL,
  notas TEXT
);
```

---

## Alcance de la Persistencia Local

> **Nota técnica:** Debido a que `SQL.js` opera íntegramente en el navegador del cliente y sincroniza su estado con `localStorage`, los registros creados, editados o eliminados **se almacenan de forma local por navegador y dominio**. Si abres la aplicación desde otro dispositivo o limpias los datos del sitio, SQLite inicializará automáticamente el inventario base de 12 componentes. Para trasladar un inventario entre equipos, utiliza las opciones **Descargar .sqlite** e **Importar .sqlite** en la barra superior.

---

## Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/Oscxr29/RigLab-Taller-de-Ensambles-Hardware.git](https://github.com/Oscxr29/RigLab-Taller-de-Ensambles-Hardware.git)
   cd RigLab-Taller-de-Ensambles-Hardware
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## Propuestas de Mejora Futura

- **Trazabilidad por número de serie y lote:** Incorporar campos opcionales de fabricante, número de serie (`S/N`) y fecha de ingreso al banco de pruebas para historial de garantías.
- **Comparador de ensambles lado a lado:** Vista dedicada para contrastar consumo energético, costo total y relación rendimiento/precio entre dos configuraciones guardadas.
- **Exportación de cotizaciones y reportes técnicos:** Generación de hojas de presupuesto y diagnóstico en formato PDF o CSV listas para entregar al cliente final.

---

## Autor

Desarrollado por **Oscar Fabricio Guevara Aguilar** ([@Oscxr29](https://github.com/Oscxr29)).