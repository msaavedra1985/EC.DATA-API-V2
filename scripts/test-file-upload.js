// scripts/test-file-upload.js
// Script de prueba para cargar archivos PDF a Azure Blob Storage
// Prueba el flujo completo: login -> request SAS URL -> upload -> confirm
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const API_BASE_URL = 'http://localhost:5000/api/v1';
const TEST_USER = {
    email: 'orgadmin@acme.com',
    password: 'TestPassword123!'
};

// Datos de prueba para diferentes owner_types
const TEST_DATA = {
    organization: 'ORG-yOM9ewfqOeWa-4', // EC.DATA
    site: 'SITE-61D4Vc4Oo9R-4', // EC.DATA Headquarters
    device: 'DEV-621EAvIr1lqB-5', // Temperature Sensor 1
    user: 'USR-K6AZe6h9KzKR-6' // orgadmin@acme.com
};

// Archivos PDF a subir
const PDF_FILES = [
    { file: '184061204311ENERO_1764096845590.pdf', ownerType: null, ownerId: null, isPublic: false },
    { file: '184061204311 FEBRERO_1764096845589.pdf', ownerType: 'site', ownerId: TEST_DATA.site, isPublic: false },
    { file: '184061204311MARZO_1764096845590.pdf', ownerType: 'device', ownerId: TEST_DATA.device, isPublic: false },
    { file: '184061204311 ABRIL_1764096845590.pdf', ownerType: 'organization', ownerId: TEST_DATA.organization, isPublic: true },
    { file: '184061204311 MAYO_1764096845590.pdf', ownerType: 'user', ownerId: TEST_DATA.user, isPublic: false }
];

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.magenta}📌 ${msg}${colors.reset}`)
};

// Función para hacer login
const login = async () => {
    log.step('Iniciando sesión...');
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
    });

    const data = await response.json();
    
    if (!data.ok) {
        throw new Error(`Login fallido: ${JSON.stringify(data)}`);
    }

    log.success(`Login exitoso como ${data.data.user.email}`);
    return data.data.access_token;
};

// Función para solicitar URL de carga
const requestUploadUrl = async (token, fileInfo, filePath) => {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    
    const payload = {
        organization_id: TEST_DATA.organization,
        original_name: fileName,
        mime_type: 'application/pdf',
        size_bytes: stats.size,
        category: 'document'
    };

    // Agregar owner si está definido
    if (fileInfo.ownerType && fileInfo.ownerId) {
        payload.owner_type = fileInfo.ownerType;
        payload.owner_id = fileInfo.ownerId;
    }

    // Agregar is_public si es true
    if (fileInfo.isPublic) {
        payload.is_public = true;
    }

    log.info(`Solicitando URL para: ${fileName}`);
    log.info(`  - owner_type: ${fileInfo.ownerType || 'organization (default)'}`);
    log.info(`  - is_public: ${fileInfo.isPublic}`);

    const response = await fetch(`${API_BASE_URL}/files/upload-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.ok) {
        throw new Error(`Error al solicitar URL: ${JSON.stringify(data)}`);
    }

    log.success(`URL obtenida - public_code: ${data.data.public_code}`);
    return data.data;
};

// Función para subir archivo a Azure
const uploadToAzure = async (uploadUrl, filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    log.info(`Subiendo ${fileName} a Azure...`);

    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'x-ms-blob-type': 'BlockBlob',
            'Content-Type': 'application/pdf'
        },
        body: fileBuffer
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al subir a Azure (${response.status}): ${errorText}`);
    }

    log.success(`Archivo subido exitosamente (HTTP ${response.status})`);
    return true;
};

// Función para confirmar carga
const confirmUpload = async (token, publicCode) => {
    log.info(`Confirmando upload para ${publicCode}...`);

    const response = await fetch(`${API_BASE_URL}/files/${publicCode}/confirm`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
    });

    const data = await response.json();

    if (!data.ok) {
        throw new Error(`Error al confirmar: ${JSON.stringify(data)}`);
    }

    log.success(`Upload confirmado - status: ${data.data.status}`);
    return data.data;
};

// Función principal
const main = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 TEST DE CARGA DE ARCHIVOS A AZURE BLOB STORAGE');
    console.log('='.repeat(60) + '\n');

    try {
        // 1. Login
        const token = await login();
        console.log('');

        // 2. Procesar cada archivo
        const results = [];
        for (const fileInfo of PDF_FILES) {
            console.log('-'.repeat(60));
            const filePath = path.join(__dirname, '..', 'attached_assets', fileInfo.file);
            
            if (!fs.existsSync(filePath)) {
                log.error(`Archivo no encontrado: ${fileInfo.file}`);
                continue;
            }

            try {
                // Solicitar URL
                const uploadData = await requestUploadUrl(token, fileInfo, filePath);
                
                // Subir a Azure
                await uploadToAzure(uploadData.upload_url, filePath);
                
                // Confirmar
                const confirmed = await confirmUpload(token, uploadData.public_code);
                
                results.push({
                    file: fileInfo.file,
                    public_code: uploadData.public_code,
                    owner_type: fileInfo.ownerType || 'organization',
                    is_public: fileInfo.isPublic,
                    blob_url: confirmed.blob_url,
                    status: 'SUCCESS'
                });
                
                console.log('');
            } catch (err) {
                log.error(`Error procesando ${fileInfo.file}: ${err.message}`);
                results.push({
                    file: fileInfo.file,
                    status: 'FAILED',
                    error: err.message
                });
            }
        }

        // 3. Resumen
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE RESULTADOS');
        console.log('='.repeat(60));
        
        const successful = results.filter(r => r.status === 'SUCCESS');
        const failed = results.filter(r => r.status === 'FAILED');
        
        console.log(`\n✅ Exitosos: ${successful.length}/${results.length}`);
        console.log(`❌ Fallidos: ${failed.length}/${results.length}\n`);

        if (successful.length > 0) {
            console.log('Archivos cargados:');
            successful.forEach(r => {
                console.log(`  • ${r.public_code} (${r.owner_type}, public: ${r.is_public})`);
                console.log(`    URL: ${r.blob_url}`);
            });
        }

        if (failed.length > 0) {
            console.log('\nErrores:');
            failed.forEach(r => {
                console.log(`  • ${r.file}: ${r.error}`);
            });
        }

        console.log('\n' + '='.repeat(60) + '\n');

    } catch (error) {
        log.error(`Error fatal: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
};

main();
