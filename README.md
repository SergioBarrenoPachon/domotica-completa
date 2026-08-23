# 🏠 Sistema Integral de Domótica, Comidas, Economía y Hogar (PWA Touch-First)

Aplicación web Full Stack completa, moderna y diseñada con enfoque **Mobile & Tablet First (PWA)** para pantallas táctiles de iPhone, iPad (10-12") y dispositivos Android, lista para ser desplegada en **Render**.

---

## ✨ Características Principales y Módulos

### 1. 📱 Dashboard Principal (Bento UI & iOS Widgets)
* **Cabecera Dinámica**: Saludo inteligente según la hora solar (`Buenos días`, `Buenas tardes`, `Buenas noches`), reloj digital con segundero en vivo y fecha completa.
* **Centro de Alertas del Hogar**: Notificaciones táctiles integradas con contador de garantías a punto de caducar (< 30 días), productos agotados en despensa y potencia eléctrica consumida en tiempo real.
* **4 Grandes Tarjetas Bento**:
  1. 🍲 **Planificador de Comidas & Despensa**
  2. 💶 **Economía Doméstica & Recurrencias**
  3. 💡 **Domótica & Conectores eWeLink/HA**
  4. 📁 **Documentación & Garantías**

---

### 2. 🍲 Planificador de Comidas, Despensa e Inventario
* **Planificación Semanal de Comidas**:
  * Tarjetas táctiles por día con 3 tomas (*Desayuno*, *Almuerzo/Comida*, *Cena*).
  * Botón **"✨ Sugerir Menú Completo"** que genera automáticamente combinaciones equilibradas y saludables con un solo toque.
  * Modal táctil de edición rápida de platos con sugerencias de recetas.
* **Control Visual de Despensa & Stock**:
  * 3 zonas organizadas: ❄️ **Nevera**, 🧊 **Congelador** y 📦 **Despensa**.
  * **Botones táctiles gigantes `+` y `-`** (mínimo 48x48px) para sumar o restar existencias sin necesidad de teclear.
  * Indicadores de **Stock Bajo** y **Agotado**.
* **Lista de la Compra Inteligente (Auto-Sincronización)**:
  * **Algoritmo de Sincronización Automática**: Al pulsar *"Auto-Sincronizar"*, la aplicación analiza las recetas del menú semanal y el stock disponible en la nevera/despensa, generando automáticamente la lista de ingredientes que faltan por comprar.
  * **Modo Supermercado**: Checkboxes táctiles gigantes para ir tachando productos mientras estás en el pasillo del súper, con animaciones de confeti y limpiador de completados.

---

### 3. 💶 Gestión de Economía Doméstica
* **Resumen Financiero Visual**:
  * Indicadores de **Ingresos Totales**, **Gastos Proyectados**, **Balance Neto** y **Caja Real Cobrada/Pagada**.
  * Barra de progreso y distribución porcentual del gasto por categorías.
* **Motor de Transacciones Recurrentes**:
  * Soporte para transacciones *Mensuales*, *Trimestrales*, *Semestrales*, *Anuales* y *Puntuales*.
  * **Sistema de Excepciones / Overrides**: Al editar un movimiento en un mes concreto, el sistema despliega un diálogo de decisión táctil:
    1. *"Modificar solo este mes (Excepción)"*: Aplica el cambio únicamente al mes seleccionado sin alterar el calendario general.
    2. *"Modificar la regla para todos los meses futuros"*: Actualiza la regla maestra para periodos sucesivos.
* **Navegador Mensual Táctil**:
  * Botones grandes `< Mes Anterior` y `Mes Siguiente >` con salto al mes actual.
  * Checkboxes de **"Pagado / Cobrado"** con estado persistente.

---

### 4. 💡 Domótica del Hogar & Conectores
* **Diseño Glassmorphism por Estancias**: Salón Principal, Cocina, Dormitorio, Baño, Terraza, etc.
* **Controles Touch-First**:
  * **Interruptores gigantes (Toggles)** con feedback visual de encendido/apagado e iluminación ambiental dinámica.
  * **Sliders gruesos de intensidad** para regular el brillo (0-100%) y temperatura de color.
  * **Reguladores de persianas/estores** con control de porcentaje y botones directos (*Subir*, *Parar*, *Bajar*).
* **Integración eWeLink & Home Assistant**:
  * Panel de configuración para ingresar credenciales de la API de **eWeLink (Sonoff)** (`App ID`, `App Secret`, `Email`, `Región`).
  * Conector para **Home Assistant & Webhooks**.
  * Botón **"🔄 Sincronizar Dispositivos"** para descubrir e importar dispositivos automáticamente.

---

### 5. 📁 Documentación del Hogar & Garantías
* **Organizador Visual**: Categorías predefinidas mediante tarjetas (*Electrodomésticos*, *Seguros*, *Contratos/Suministros*, *Vehículos*, *Garantías*).
* **Digitalización con Cámara**: Botón optimizado para capturar fotos de facturas o pólizas directamente desde la cámara del móvil o tablet, o subir archivos PDF.
* **Visor Integrado Táctil**: Consulta facturas, condiciones de seguros y manuales sin salir de la aplicación.
* **Semáforo de Garantías**:
  * 🔴 **Urgente / Vencido** (Menos de 30 días restantes)
  * 🟡 **Próximo a Vencer** (Menos de 90 días)
  * 🟢 **Vigente**
  * Sincronización automática de alertas con el Dashboard superior.

---

## 🚀 Despliegue en Render (Paso a Paso)

### Opción A: Despliegue Automático con `render.yaml` (Blueprint)
1. Sube este proyecto a tu repositorio de **GitHub**.
2. Entra en tu panel de control de [Render](https://dashboard.render.com/).
3. Haz clic en **"New +"** $\rightarrow$ **"Blueprint"**.
4. Conecta tu repositorio de GitHub. Render detectará automáticamente el archivo `render.yaml`.
5. Haz clic en **"Apply"**. Render creará el Web Service, compilará el frontend con Vite y arrancará el servidor Node.js en el puerto `10000`.

---

### Opción B: Despliegue Manual como Web Service
Si prefieres crearlo manualmente:
1. En Render Dashboard, haz clic en **"New +"** $\rightarrow$ **"Web Service"**.
2. Conecta tu repositorio de GitHub.
3. Configura los siguientes campos:
   * **Name:** `domotica-hogar`
   * **Language:** `Node`
   * **Branch:** `main` (o `master`)
   * **Build Command:** `npm run install:all && npm run build`
   * **Start Command:** `node server/index.js`
4. En la pestaña **Environment Variables**, añade:
   * `NODE_ENV` = `production`
   * `PORT` = `10000`
5. *(Opcional)* En la pestaña **Disks**, añade un disco persistente montado en `/var/data` para conservar la base de datos y los archivos adjuntos entre reinicios.
6. Haz clic en **"Deploy Web Service"**.

---

### Opción C: Despliegue con Docker
La aplicación incluye un `Dockerfile` multi-stage optimizado:
1. En Render, selecciona **"Docker"** como Runtime.
2. Render compilará la imagen de Docker basada en `node:20-alpine` y publicará el servicio automáticamente.

---

## 💻 Ejecución en Local (Desarrollo)

### Prerrequisitos:
* **Node.js**: v18 o superior (v20/v24 recomendada).
* **NPM**: v9 o superior.

### Pasos:
```bash
# 1. Instalar dependencias del backend y frontend
npm run install:all

# 2. Compilar el cliente para producción
npm run build

# 3. Arrancar el servidor unificado
npm start
```
Abre tu navegador en [http://localhost:10000](http://localhost:10000).

Para desarrollo con Hot Module Replacement (HMR):
```bash
# En una terminal (Backend Express):
npm run dev:server

# En otra terminal (Frontend Vite):
npm run dev:client
```
El cliente de desarrollo se ejecutará en [http://localhost:5173](http://localhost:5173) con proxy automático a la API en el puerto 10000.

---

## 📱 Instalación como PWA en Móvil / Tablet
1. Abre la URL en **Safari** (iOS / iPad) o **Chrome** (Android).
2. Toca en el botón **Compartir** $\rightarrow$ **"Añadir a la pantalla de inicio"** (*Add to Home Screen*).
3. La aplicación se abrirá a pantalla completa como una App nativa con targets táctiles $\ge 48\times 48\text{ px}$ y sin barras de navegación del navegador.

---

## 🛠️ Estructura del Código

```
├── package.json              # Scripts de build, start y dependencias principales
├── render.yaml               # Infraestructura como código para Render
├── Dockerfile                # Multi-stage build para despliegue en contenedor
├── .env.example              # Plantilla de variables de entorno
├── server/                   # Backend Node.js Express
│   ├── index.js              # Servidor principal y router REST
│   ├── db/
│   │   ├── database.js       # Capa de almacenamiento y lógica de negocio
│   │   └── seedData.js       # Datos de inicialización realistas
│   └── routes/
│       ├── dashboard.js      # Resumen de alertas y métricas en vivo
│       ├── meals.js          # Planificador y sugerencias de menús
│       ├── pantry.js         # Despensa, nevera y ajustes de stock
│       ├── shopping.js       # Lista de la compra y sincronización inteligente
│       ├── finance.js        # Motor de finanzas, recurrencias y overrides
│       ├── domotics.js       # Domótica, estancias y puente eWeLink
│       └── documents.js      # Documentos, fotos/PDFs y cálculo de garantías
└── client/                   # Frontend React + Vite + Tailwind + Framer Motion
    ├── index.html            # Entry HTML con meta tags PWA
    ├── vite.config.js        # Configuración de Vite y proxy
    ├── tailwind.config.js    # Configuración de estilos Bento UI y tema oscuro
    └── src/
        ├── App.jsx           # Router principal y barra táctil
        ├── index.css         # Estilos glassmorphism y safe-area
        ├── components/       # Header, NavPill, Modal y controles táctiles
        └── views/            # Dashboard, MealsView, FinanceView, DomoticsView, DocumentsView
```
