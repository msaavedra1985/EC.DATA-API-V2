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
        first_name: z
            .string({
                required_error: 'Nombre es requerido'
            })
            .min(2, 'Nombre debe tener al menos 2 caracteres')
            .max(100, 'Nombre no puede exceder 100 caracteres')
            .trim(),
        last_name: z
            .string({
                required_error: 'Apellido es requerido'
            })
            .min(2, 'Apellido debe tener al menos 2 caracteres')
            .max(100, 'Apellido no puede exceder 100 caracteres')
            .trim(),
        tenant_id: z
            .string()
            .uuid('tenant_id debe ser un UUID válido')
            .optional()
            .nullable()
    })
});

/**
 * Schema para login
 * POST /auth/login
 */
export const loginSchema = z.object({
    body: z.object({
        email: z
            .string({
                required_error: 'Email es requerido'
            })
            .email('Formato de email inválido')
            .toLowerCase()
            .trim(),
        password: z
            .string({
                required_error: 'Password es requerido'
            })
            .min(1, 'Password no puede estar vacío')
    })
});

/**
 * Schema para refresh token
 * POST /auth/refresh
 */
export const refreshTokenSchema = z.object({
    body: z.object({
        refresh_token: z
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
        current_password: z
            .string({
                required_error: 'Password actual es requerido'
            })
            .min(1, 'Password actual no puede estar vacío'),
        new_password: z
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
        new_password: z
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
