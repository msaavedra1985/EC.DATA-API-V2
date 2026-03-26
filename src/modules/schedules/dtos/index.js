import { z } from 'zod';

// Regex HH:mm con soporte a 24:00
const timeRegex = /^([01]\d|2[0-4]):[0-5]\d$|^24:00$/;

const timeRangeSchema = z.object({
    from: z.string().regex(timeRegex, 'Formato de hora inválido. Use HH:mm (ej: 08:00, 24:00)'),
    to:   z.string().regex(timeRegex, 'Formato de hora inválido. Use HH:mm (ej: 12:00, 24:00)')
}).refine(r => {
    const [fh, fm] = r.from.split(':').map(Number);
    const [th, tm] = r.to.split(':').map(Number);
    return fh * 60 + fm < th * 60 + tm;
}, { message: 'El rango de hora debe ser: from < to' });

const timeProfileSchema = z.object({
    name: z.string().min(1).max(200),
    grid: z.record(
        z.string().regex(/^[1-7]$/, 'Clave del grid debe ser 1-7 (ISO 8601)'),
        z.array(timeRangeSchema).min(1)
    )
});

const exceptionSchema = z.object({
    date:         z.string().date('Formato de fecha inválido. Use YYYY-MM-DD'),
    name:         z.string().min(1).max(200),
    type:         z.enum(['closed', 'special']).default('closed'),
    repeatYearly: z.boolean().default(false)
});

const validitySchema = z.object({
    validFrom: z.string().date().nullable().optional().default(null),
    validTo:   z.string().date().nullable().optional().default(null),
    timeProfiles: z.array(timeProfileSchema).min(1),
    exceptions: z.array(exceptionSchema).optional().default([])
});

export const createScheduleSchema = z.object({
    body: z.object({
        name:        z.string().min(1).max(200),
        description: z.string().max(2000).nullable().optional(),
        validities:  z.array(validitySchema).min(1)
    })
});

export const getScheduleSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    query: z.object({
        include: z.enum(['validities', 'full']).optional()
    }).optional()
});

export const listSchedulesSchema = z.object({
    query: z.object({
        limit:  z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
        include: z.enum(['validities', 'full']).optional()
    }).optional()
});

export const deleteScheduleSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    })
});

export const getValiditiesSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    })
});

export const getValidityRangesSchema = z.object({
    params: z.object({
        id: z.string().min(1),
        validityId: z.coerce.number().int().positive()
    })
});

export const updateValiditySchema = z.object({
    params: z.object({
        id: z.string().min(1),
        validityId: z.coerce.number().int().positive()
    }),
    body: z.object({
        validFrom:    z.string().date().nullable().optional(),
        validTo:      z.string().date().nullable().optional(),
        nextValidity: validitySchema.optional()
    })
    .refine(data => data.validFrom !== undefined || data.validTo !== undefined, {
        message: 'Debe proporcionar al menos validFrom o validTo'
    })
    .refine(data => !data.nextValidity || data.validTo !== undefined, {
        message: 'validTo es requerido cuando se provee nextValidity'
    })
    .refine(data => !data.nextValidity || (data.validTo !== null), {
        message: 'validTo no puede ser nulo cuando se provee nextValidity — una vigencia sin fecha de cierre no puede tener sucesora'
    })
});

export const updateValidityRangesSchema = z.object({
    params: z.object({
        id: z.string().min(1),
        validityId: z.coerce.number().int().positive()
    }),
    body: z.object({
        timeProfiles: z.array(timeProfileSchema).min(1)
    })
});

export const updateScheduleSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        name:        z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional()
    }).refine(data => data.name !== undefined || data.description !== undefined, {
        message: 'Debe proporcionar al menos name o description'
    })
});

export const addValiditySchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: validitySchema
});

export const deleteValiditySchema = z.object({
    params: z.object({
        id: z.string().min(1),
        validityId: z.coerce.number().int().positive()
    })
});

export const updateExceptionsSchema = z.object({
    params: z.object({
        id: z.string().min(1),
        validityId: z.coerce.number().int().positive()
    }),
    body: z.object({
        exceptions: z.array(exceptionSchema)
    })
});

const timeProfileUpdateSchema = z.object({
    id:   z.number().int().positive().optional(),
    name: z.string().min(1).max(200),
    grid: z.record(
        z.string().regex(/^[1-7]$/, 'Clave del grid debe ser 1-7 (ISO 8601)'),
        z.array(timeRangeSchema).min(1)
    )
});

export const updateValidityFullSchema = z.object({
    params: z.object({
        id:         z.string().min(1),
        validityId: z.coerce.number().int().positive()
    }),
    body: z.object({
        validFrom:    z.string().date().nullable().optional().default(null),
        validTo:      z.string().date().nullable().optional().default(null),
        timeProfiles: z.array(timeProfileUpdateSchema).min(1),
        exceptions:   z.array(exceptionSchema).optional()
    })
});
