# ReactjsmainLottery - Sistema de Gestión de Lotería

Sistema completo de gestión de lotería desarrollado en React + TypeScript + Vite con Supabase como backend.

## Características

- **Venta de Boletos**: Interfaz completa para vender boletos de lotería
- **Verificación de Premios**: Comprobar boletos ganadores
- **Impresión de Tickets**: Generar tickets para clientes
- **Cancelación de Boletos**: Anular boletos vendidos
- **Dashboard**: Resumen de ventas y estadísticas
- **Autenticación**: Login/Registro con Supabase Auth
- **Roles**: Admin, Vendedor, Visor
- **Tema**: Soporte para modo oscuro/claro

## Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Radix UI + Tailwind CSS + shadcn/ui style components
- **Estado**: Zustand + TanStack Query
- **Backend**: Supabase (Auth + Database)
- **Formularios**: React Hook Form + Zod
- **Routing**: React Router v6
- **Gráficos**: Recharts

## Instalación

```bash
# Clonar repositorio
cd ReactjsmainLottery

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar desarrollo
npm run dev
```

## Variables de Entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Estructura de Base de Datos (Supabase)

### Tablas Principales

```sql
-- Loterías
CREATE TABLE lotteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  max_tickets INTEGER NOT NULL,
  sold_tickets INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  draw_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boletos
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id UUID REFERENCES lotteries(id),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  seller_id UUID REFERENCES auth.users(id),
  seller_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('sold', 'cancelled', 'pending')) DEFAULT 'sold',
  sold_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  prize_won DECIMAL(10,2),
  prize_type TEXT
);

-- Perfiles de Usuario
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'seller', 'viewer')) DEFAULT 'seller',
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración de Premios
CREATE TABLE prize_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id UUID REFERENCES lotteries(id),
  prize_type TEXT NOT NULL,
  prize_name TEXT NOT NULL,
  prize_value DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  winning_condition TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resultados de Sorteos
CREATE TABLE lottery_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id UUID REFERENCES lotteries(id),
  draw_date DATE NOT NULL,
  winning_numbers TEXT[],
  prize_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Horarios de Sorteos
CREATE TABLE lottery_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id UUID REFERENCES lotteries(id),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  draw_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Funciones RPC para Reportes

```sql
-- Resumen de ventas
CREATE OR REPLACE FUNCTION get_sales_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_sales', COALESCE(SUM(t.price), 0),
    'total_tickets', COUNT(*),
    'total_revenue', COALESCE(SUM(t.price), 0),
    'by_lottery', (
      SELECT json_agg(json_build_object(
        'lottery_id', l.id,
        'lottery_name', l.name,
        'tickets_sold', COUNT(t.id),
        'revenue', COALESCE(SUM(t.price), 0)
      ))
      FROM lotteries l
      LEFT JOIN tickets t ON t.lottery_id = l.id AND t.status = 'sold'
      GROUP BY l.id
    ),
    'by_seller', (
      SELECT json_agg(json_build_object(
        'seller_id', t.seller_id,
        'seller_name', t.seller_name,
        'tickets_sold', COUNT(*),
        'revenue', COALESCE(SUM(t.price), 0)
      ))
      FROM tickets t
      WHERE t.status = 'sold'
      GROUP BY t.seller_id, t.seller_name
    )
  ) INTO result
  FROM tickets t
  WHERE t.status = 'sold';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Ventas por usuario
CREATE OR REPLACE FUNCTION get_sales_by_user()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(json_build_object(
      'id', up.id,
      'seller_name', up.full_name,
      'total_tickets', COUNT(t.id),
      'total_revenue', COALESCE(SUM(t.price), 0),
      'lotteries', (
        SELECT json_agg(json_build_object(
          'lottery_name', l.name,
          'tickets', COUNT(t2.id),
          'revenue', COALESCE(SUM(t2.price), 0)
        ))
        FROM tickets t2
        JOIN lotteries l ON l.id = t2.lottery_id
        WHERE t2.seller_id = up.id AND t2.status = 'sold'
        GROUP BY l.name
      )
    ))
    FROM user_profiles up
    LEFT JOIN tickets t ON t.seller_id = up.id AND t.status = 'sold'
    WHERE up.role IN ('seller', 'admin')
    GROUP BY up.id, up.full_name;
END;
$$ LANGUAGE plpgsql;
```

## Scripts Disponibles

```bash
npm run dev      # Iniciar servidor de desarrollo
npm run build    # Construir para producción
npm run preview  # Vista previa de build
npm run lint     # Ejecutar linter
```

## Estructura del Proyecto

```
src/
├── components/
│   ├── ui/           # Componentes base (shadcn/ui style)
│   ├── lottery/      # Componentes de lotería (SellTicket, VerifyPrize, etc.)
│   ├── dashboard/    # Componentes del dashboard
│   ├── admin/        # Componentes de administración
│   └── layout/       # Layout principal
├── pages/            # Páginas principales
├── hooks/            # Custom hooks
├── lib/              # Utilidades y API
├── types/            # Tipos TypeScript
├── constants/        # Constantes
├── config/           # Configuración (Supabase)
└── App.tsx           # App principal con routing
```

## Despliegue

```bash
npm run build
# El output estará en dist/
# Desplegar en Vercel, Netlify, o cualquier hosting estático
```

## Licencia

MIT