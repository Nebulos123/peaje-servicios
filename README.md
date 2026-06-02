# 🚧 Control de Antenas y Discos — Peaje

Aplicación web para el monitoreo en tiempo real del servicio de antenas y el estado de los discos de almacenamiento en un peaje con 46 vías (1–40, 43, 44, 46, 47, 50, 51).

## ✨ Características

- **Panel de vías interactivo**: Grid visual con 46 vías. Click para registrar caídas de antena o discos llenos. Click derecho para formulario detallado.
- **Dos modos de monitoreo**:
  - 📡 **Antenas Colgadas / Reinicios**: Registra cada vez que el servicio de antena se cae y se restablece.
  - 💾 **Discos Llenos**: Alerta cuando el disco de una vía se satura, con cálculo de frecuencia de llenado para mantenimiento preventivo.
- **Historial completo**: Filtros por tipo de evento, vía, estado y búsqueda de notas.
- **Estadísticas avanzadas**:
  - Ranking de vías problemáticas
  - Distribución por hora del día (horas críticas)
  - Tendencia diaria con gráfico SVG
  - **Frecuencia de llenado de discos**: calcula cada cuántos días se llena el disco por vía
- **Diseño moderno**: Tema oscuro, Tailwind CSS, animaciones, responsive.

## 🛠 Stack Tecnológico

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Backend**: Next.js API Routes (App Router)
- **Base de datos**: PostgreSQL + Drizzle ORM
- **Despliegue recomendado**: Vercel + Vercel Postgres / Supabase / Railway

---

## 🚀 Despliegue en Vercel (Recomendado y Gratuito)

### Paso 1: Crear repositorio en GitHub

```bash
# Inicializar git (si no lo has hecho)
git init

# Añadir todos los archivos
git add .

# Commit inicial
git commit -m "Primer commit - Control de Antenas Peaje"

# Crear repo en GitHub (desde la web o CLI)
# Luego conectar:
git remote add origin https://github.com/TU_USUARIO/control-antenas-peaje.git
git branch -M main
git push -u origin main
```

### Paso 2: Crear base de datos PostgreSQL

**Opción A — Vercel Postgres (más fácil, integrado):**
1. Ve a [vercel.com](https://vercel.com) → Dashboard → Storage → Create → Postgres
2. Crea una base de datos (gratis en el plan Hobby)
3. Copia la `DATABASE_URL` que te da Vercel

**Opción B — Supabase (también gratis):**
1. Ve a [supabase.com](https://supabase.com) → New Project
2. En Settings → Database → Connection String → URI
3. Copia la URL y reemplaza `[YOUR-PASSWORD]` por tu contraseña real

**Opción C — Railway:**
1. Ve a [railway.app](https://railway.app) → New Project → Add PostgreSQL
2. Ve a Variables → copia `DATABASE_URL`

### Paso 3: Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → Add New Project
2. Importa tu repositorio de GitHub
3. En **Environment Variables**, añade:
   - `DATABASE_URL` = la URL de tu base de datos del paso anterior
4. Click en **Deploy**

### Paso 4: Aplicar el esquema de base de datos

Una vez desplegado, necesitas crear las tablas. Puedes hacerlo de dos formas:

**Forma A — Local (recomendada):**
```bash
# Clona tu repo
git clone https://github.com/TU_USUARIO/control-antenas-peaje.git
cd control-antenas-peaje

# Instala dependencias
npm install

# Crea un archivo .env con tu DATABASE_URL de producción
echo "DATABASE_URL=tu_url_de_produccion" > .env

# Aplica el esquema
npx drizzle-kit push
```

**Forma B — Directamente en Vercel (usando la consola de Vercel):**
1. Ve a tu proyecto en Vercel → Settings → Environment Variables
2. Asegúrate de que `DATABASE_URL` está configurada
3. Ve a la pestaña **Deployments** → selecciona el último deploy → **Runtime Logs**
4. O usa la CLI de Vercel:
```bash
npx vercel --prod
# Luego conecta a la base de datos y ejecuta drizzle-kit push
```

### Paso 5: ¡Listo!

Tu aplicación estará online en una URL tipo `https://control-antenas-peaje.vercel.app`

---

## 🖥 Desarrollo Local

### Requisitos
- Node.js 20+
- PostgreSQL local (o usar Docker)

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/control-antenas-peaje.git
cd control-antenas-peaje

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env y pon tu DATABASE_URL

# 4. Crear base de datos (si usas PostgreSQL local)
createdb app_db

# 5. Aplicar esquema
npx drizzle-kit push

# 6. Iniciar servidor de desarrollo
npm run dev
```

La app estará en `http://localhost:3000`

---

## 📁 Estructura del Proyecto

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── incidents/        # CRUD de incidentes
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   └── stats/route.ts    # Endpoint de estadísticas
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Dashboard.tsx         # Panel principal con modos
│   │   ├── LaneGrid.tsx          # Grid de 46 vías
│   │   ├── IncidentModal.tsx     # Modal de registro detallado
│   │   ├── HistoryTable.tsx      # Tabla de historial
│   │   └── StatsPanel.tsx        # Panel de estadísticas
│   ├── db/
│   │   ├── schema.ts             # Esquema Drizzle (incidents)
│   │   └── index.ts              # Conexión a PostgreSQL
│   └── lib/
│       └── lanes.ts              # Vías válidas y utilidades
├── .env.example
├── drizzle.config.json
├── next.config.ts
└── package.json
```

---

## 🔄 Actualizar después de cambios

Cada vez que hagas cambios en el código:

```bash
git add .
git commit -m "Descripción del cambio"
git push origin main
```

Vercel se encarga automáticamente de redeployar.

---

## 💡 Tips para Producción

1. **Variables de entorno**: Nunca subas tu `.env` real a GitHub. Usa siempre `.env.example` como plantilla.

2. **Base de datos en Vercel**: Si usas Vercel Postgres, la conexión es automática y no necesitas configurar nada más.

3. **Dominio personalizado**: En Vercel → Settings → Domains, puedes conectar tu propio dominio gratis.

4. **Backups**: Si usas Supabase o Railway, configura backups automáticos desde el panel.

5. **Acceso desde móvil**: La app es 100% responsive. Puedes acceder desde el celular usando la URL de Vercel.

---

## 📄 Licencia

MIT — Libre para usar y modificar.
