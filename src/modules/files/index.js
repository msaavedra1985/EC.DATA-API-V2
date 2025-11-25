// modules/files/index.js
// Punto de entrada del módulo de files
import router from './routes.js';
import FileUpload from './models/FileUpload.js';
import * as fileServices from './services.js';
import * as fileRepository from './repository.js';

export {
    router as default,
    FileUpload,
    fileServices,
    fileRepository
};
