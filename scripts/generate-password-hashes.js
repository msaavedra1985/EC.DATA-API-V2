#!/usr/bin/env node
// Script para generar hashes de contraseñas para producción
// Uso: node scripts/generate-password-hashes.js

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10; // Estándar de producción

const passwords = {
  'Admin123!': 'Para: admin@ecdata.com, admin@acme.com, admin@techsolutions.com.ar',
  'Manager123!': 'Para: manager@acme.com',
  'User123!': 'Para: user@acme.com',
  'Dev123!': 'Para: developer@techsolutions.com.ar',
  'Viewer123!': 'Para: viewer@global.es',
  'Guest123!': 'Para: guest@ecdata.com',
  'Demo123!': 'Para: demo@ecdata.com'
};

console.log('\n🔐 GENERANDO HASHES DE CONTRASEÑAS PARA PRODUCCIÓN\n');
console.log('=' .repeat(70));

const generateHashes = async () => {
  for (const [password, description] of Object.entries(passwords)) {
    try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      console.log(`\n📌 Contraseña: "${password}"`);
      console.log(`   ${description}`);
      console.log(`   Hash: ${hash}`);
    } catch (error) {
      console.error(`❌ Error generando hash para "${password}":`, error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n✅ Hashes generados exitosamente');
  console.log('\n📝 INSTRUCCIONES:');
  console.log('   1. Copiar los hashes generados arriba');
  console.log('   2. Reemplazar los hashes en scripts/seed-production-data.sql');
  console.log('   3. Ejecutar el script SQL en la base de datos de producción');
  console.log('   4. Eliminar este archivo y PRODUCTION_CREDENTIALS.md por seguridad\n');
};

generateHashes().catch(console.error);
