// modules/organizations/dtos/batchDelete.dto.js
// DTO y validación para eliminación batch de organizaciones

import { z } from 'zod';

/**
 * Schema Zod para eliminación batch de organizaciones
 */
export const batchDeleteOrganizationSchema = z.object({
    organization_ids: z.array(
        z.string().min(1, 'Organization ID (public_code) cannot be empty')
    )
    .min(1, 'At least one organization ID is required')
    .max(50, 'Maximum 50 organizations can be deleted at once'),
    
    hard_delete: z.boolean()
        .optional()
        .default(false),
    
    delete_users: z.boolean()
        .optional()
        .default(false),
    
    reassign_org_id: z.string()
        .min(1, 'Reassign organization ID (public_code) cannot be empty')
        .optional()
        .nullable()
});

/**
 * Schema para generar presigned URL de Azure
 */
export const generateUploadUrlSchema = z.object({
    filename: z.string()
        .min(1, 'Filename is required')
        .max(255, 'Filename must not exceed 255 characters'),
    
    content_type: z.string()
        .min(1, 'Content type is required')
        .regex(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/, 'Content type must be a valid image format (png, jpeg, jpg, webp, svg+xml)'),
    
    prefix: z.string()
        .regex(/^[a-z0-9-]+$/, 'Prefix must contain only lowercase letters, numbers, and hyphens')
        .optional()
        .default('org-logo'),
    
    expiry_minutes: z.number()
        .int()
        .min(5, 'Expiry must be at least 5 minutes')
        .max(120, 'Expiry cannot exceed 120 minutes')
        .optional()
        .default(60)
});

/**
 * Schema para validar slug
 */
export const validateSlugSchema = z.object({
    slug: z.string()
        .min(2, 'Slug must be at least 2 characters')
        .max(100, 'Slug must not exceed 100 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
        .trim()
});

/**
 * Función helper para validar batch delete
 */
export const validateBatchDelete = (data) => {
    return batchDeleteOrganizationSchema.parse(data);
};

/**
 * Función helper para validar upload URL
 */
export const validateGenerateUploadUrl = (data) => {
    return generateUploadUrlSchema.parse(data);
};

/**
 * Función helper para validar slug
 */
export const validateSlug = (data) => {
    return validateSlugSchema.parse(data);
};

export default {
    batchDeleteOrganizationSchema,
    generateUploadUrlSchema,
    validateSlugSchema,
    validateBatchDelete,
    validateGenerateUploadUrl,
    validateSlug
};
