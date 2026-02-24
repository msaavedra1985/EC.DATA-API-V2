// modules/auth/dtos/index.js
// DTOs (Data Transfer Objects) con Zod para validación de Auth

import { z } from 'zod';

/**
 * Schema para registro de usuario
 * POST /auth/register
 */
export const registerSchema = z.object({
    body: z.object({
        email: z
            .string({
                required_error: 'Email es requerido',
                invalid_type_error: 'Email debe ser un string'
            })
            .email('Formato de email inválido')
            .toLowerCase()
            .trim(),
        password: z
            .string({
                required_error: 'Password es requerido'
            })
            .min(8, 'Password debe tener al menos 8 caracteres')
            .max(100, 'Password no puede exceder 100 caracteres')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Password debe contener al menos una mayúscula, una minúscula y un número'
            ),
        firstName: z
            .string({
                required_error: 'Nombre es requerido'
            })
            .min(2, 'Nombre debe tener al menos 2 caracteres')
            .max(100, 'Nombre no puede exceder 100 caracteres')
            .trim(),
        lastName: z
            .string({
                required_error: 'Apellido es requerido'
            })
            .min(2, 'Apellido debe tener al menos 2 caracteres')
            .max(100, 'Apellido no puede exceder 100 caracteres')
            .trim(),
        organizationId: z
            .string()
            .uuid('organizationId debe ser un UUID válido')
            .optional()
            .nullable()
    })
});

/**
 * Schema para login
 * POST /auth/login
 * 
 * Login híbrido: acepta email o username en el campo 'identifier' o 'email' (compatibilidad)
 * Captcha opcional: si TURNSTILE_SECRET_KEY está configurado, se valida el token
 */
export const loginSchema = z.object({
    body: z.object({
        // Campo genérico que acepta email o username (nuevo)
        identifier: z
            .string()
            .min(1, 'Email o nombre de usuario no puede estar vacío')
            .max(255, 'Identificador demasiado largo')
            .trim()
            .optional(),
        // Campo legacy para compatibilidad con frontends existentes
        email: z
            .string()
            .min(1, 'Email no puede estar vacío')
            .max(255, 'Email demasiado largo')
            .trim()
            .optional(),
        password: z
            .string({
                required_error: 'Password es requerido'
            })
            .min(1, 'Password no puede estar vacío'),
        rememberMe: z
            .boolean({
                invalid_type_error: 'rememberMe debe ser un booleano'
            })
            .optional()
            .default(false),
        captchaToken: z
            .string()
            .optional()
            .nullable()
    }).refine(
        // Al menos uno de identifier o email debe estar presente
        (data) => data.identifier || data.email,
        { message: 'Email o identificador es requerido', path: ['identifier'] }
    )
});

/**
 * Schema para refresh token
 * POST /auth/refresh
 */
export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z
            .string({
                required_error: 'Refresh token es requerido'
            })
            .min(1, 'Refresh token no puede estar vacío')
    })
});

/**
 * Schema para cambio de password
 * POST /auth/change-password
 */
export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z
            .string({
                required_error: 'Password actual es requerido'
            })
            .min(1, 'Password actual no puede estar vacío'),
        newPassword: z
            .string({
                required_error: 'Nuevo password es requerido'
            })
            .min(8, 'Nuevo password debe tener al menos 8 caracteres')
            .max(100, 'Nuevo password no puede exceder 100 caracteres')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Nuevo password debe contener al menos una mayúscula, una minúscula y un número'
            )
    })
});

/**
 * Schema para solicitud de reset de password
 * POST /auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z
            .string({
                required_error: 'Email es requerido'
            })
            .email('Formato de email inválido')
            .toLowerCase()
            .trim()
    })
});

/**
 * Schema para reset de password con token
 * POST /auth/reset-password
 */
export const resetPasswordSchema = z.object({
    body: z.object({
        token: z
            .string({
                required_error: 'Token es requerido'
            })
            .min(1, 'Token no puede estar vacío'),
        newPassword: z
            .string({
                required_error: 'Nuevo password es requerido'
            })
            .min(8, 'Nuevo password debe tener al menos 8 caracteres')
            .max(100, 'Nuevo password no puede exceder 100 caracteres')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Nuevo password debe contener al menos una mayúscula, una minúscula y un número'
            )
    })
});

/**
 * Schema para logout
 * POST /auth/logout
 * refreshToken puede venir en body o en header Authorization
 */
export const logoutSchema = z.object({
    body: z.object({
        refreshToken: z
            .string()
            .min(1, 'Refresh token no puede estar vacío')
            .optional()
    })
});

/**
 * Schema para revocar sesión específica
 * POST /auth/sessions/:sessionId/revoke
 */
export const revokeSessionSchema = z.object({
    params: z.object({
        sessionId: z
            .string({
                required_error: 'Session ID es requerido'
            })
            .uuid('Session ID debe ser un UUID válido')
    })
});

/**
 * Schema para cambiar organización activa
 * POST /auth/switch-org
 * 
 * Acepta publicCode de la organización (ej: "ORG-xyz123-1")
 */
export const switchOrgSchema = z.object({
    body: z.object({
        organizationId: z
            .string({
                required_error: 'organizationId es requerido'
            })
            .min(1, 'organizationId no puede estar vacío')
    })
});
