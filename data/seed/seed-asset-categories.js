/**
 * Script de seed para AssetCategory
 * Crea jerarquía de ejemplo: Aire Acondicionado -> Split -> Samsung
 * 
 * Uso: node data/seed/seed-asset-categories.js <organization_uuid>
 * 
 * Ejemplo: node data/seed/seed-asset-categories.js "01919eb8-5e8a-7890-b456-123456789abc"
 */

import sequelize from '../../src/db/sql/sequelize.js';
import AssetCategory from '../../src/modules/asset-categories/models/AssetCategory.js';

const seedAssetCategories = async (organizationId) => {
  if (!organizationId) {
    console.error('❌ Error: Debes proporcionar el UUID de una organización');
    console.log('Uso: node data/seed/seed-asset-categories.js <organization_uuid>');
    process.exit(1);
  }

  console.log('🌱 Iniciando seed de AssetCategory...');
  console.log(`📍 Organización: ${organizationId}`);

  const transaction = await sequelize.transaction();

  try {
    // Nivel 1: Aire Acondicionado (raíz)
    const aireAcondicionado = await AssetCategory.create({
      name: 'Aire Acondicionado',
      color: '#3B82F6', // Azul
      scope: 'organization',
      organization_id: organizationId
    }, { transaction });

    console.log(`✅ Creado: ${aireAcondicionado.name} (id=${aireAcondicionado.id}, level=${aireAcondicionado.level})`);

    // Nivel 2: Split (hijo de Aire Acondicionado)
    const split = await AssetCategory.create({
      name: 'Split',
      color: '#10B981', // Verde
      parent_id: aireAcondicionado.id,
      scope: 'organization',
      organization_id: organizationId
    }, { transaction });

    // Refetch para obtener path actualizado
    await split.reload({ transaction });
    console.log(`✅ Creado: ${split.name} (id=${split.id}, level=${split.level}, path=${split.path})`);

    // Nivel 3: Samsung (hijo de Split)
    const samsung = await AssetCategory.create({
      name: 'Samsung',
      color: '#F59E0B', // Naranja
      parent_id: split.id,
      scope: 'organization',
      organization_id: organizationId
    }, { transaction });

    await samsung.reload({ transaction });
    console.log(`✅ Creado: ${samsung.name} (id=${samsung.id}, level=${samsung.level}, path=${samsung.path})`);

    // Nivel 3: LG (otro hijo de Split)
    const lg = await AssetCategory.create({
      name: 'LG',
      color: '#EF4444', // Rojo
      parent_id: split.id,
      scope: 'organization',
      organization_id: organizationId
    }, { transaction });

    await lg.reload({ transaction });
    console.log(`✅ Creado: ${lg.name} (id=${lg.id}, level=${lg.level}, path=${lg.path})`);

    // Nivel 2: Centralizado (otro hijo de Aire Acondicionado)
    const centralizado = await AssetCategory.create({
      name: 'Centralizado',
      color: '#8B5CF6', // Púrpura
      parent_id: aireAcondicionado.id,
      scope: 'organization',
      organization_id: organizationId
    }, { transaction });

    await centralizado.reload({ transaction });
    console.log(`✅ Creado: ${centralizado.name} (id=${centralizado.id}, level=${centralizado.level}, path=${centralizado.path})`);

    // Otra categoría raíz: Iluminación
    const iluminacion = await AssetCategory.create({
      name: 'Iluminación',
      color: '#FBBF24', // Amarillo
      scope: 'organization',
      organization_id: organizationId
    }, { transaction });

    console.log(`✅ Creado: ${iluminacion.name} (id=${iluminacion.id}, level=${iluminacion.level})`);

    // LED (hijo de Iluminación)
    const led = await AssetCategory.create({
      name: 'LED',
      color: '#34D399', // Verde claro
      parent_id: iluminacion.id,
      scope: 'organization',
      organization_id: organizationId
    }, { transaction });

    await led.reload({ transaction });
    console.log(`✅ Creado: ${led.name} (id=${led.id}, level=${led.level}, path=${led.path})`);

    await transaction.commit();

    console.log('\n📊 Resumen de jerarquía creada:');
    console.log('├── Aire Acondicionado');
    console.log('│   ├── Split');
    console.log('│   │   ├── Samsung');
    console.log('│   │   └── LG');
    console.log('│   └── Centralizado');
    console.log('└── Iluminación');
    console.log('    └── LED');
    console.log('\n🎉 Seed completado exitosamente!');

    // Probar método getDescendants
    console.log('\n🧪 Probando getDescendants() para "Aire Acondicionado":');
    const acRefresh = await AssetCategory.findByPk(aireAcondicionado.id);
    const descendants = await acRefresh.getDescendants();
    descendants.forEach(d => {
      console.log(`   - ${d.name} (level=${d.level})`);
    });

    // Probar método getAncestors
    console.log('\n🧪 Probando getAncestors() para "Samsung":');
    const samsungRefresh = await AssetCategory.findByPk(samsung.id);
    const ancestors = await samsungRefresh.getAncestors();
    ancestors.forEach(a => {
      console.log(`   - ${a.name} (level=${a.level})`);
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error durante el seed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Ejecutar seed con el ID de organización del argumento
const organizationId = process.argv[2];
seedAssetCategories(organizationId);
