#!/bin/bash
# Script para sincronizar esquema de la base de datos en desarrollo
# Ejecutar después de cambios en modelos Sequelize

psql $DATABASE_URL << EOF
-- Crear tipo ENUM si no existe
DO \$\$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_sites_building_type') THEN
        CREATE TYPE enum_sites_building_type AS ENUM (
            'office', 'warehouse', 'factory', 'retail', 
            'hospital', 'school', 'datacenter', 'hotel', 
            'restaurant', 'residential', 'mixed', 'other'
        );
    END IF;
END \$\$;

-- Agregar columnas nuevas si no existen
ALTER TABLE sites ADD COLUMN IF NOT EXISTS building_type enum_sites_building_type;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS area_m2 DECIMAL(10, 2);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS floors INTEGER;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(200);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100);

SELECT '✅ Esquema sincronizado correctamente' as status;
EOF

