import { z } from 'zod';
import { 
  insertInventorySchema, 
  insertServiceRequestSchema,
  insertPartsConsumedSchema,
  inventory, 
  serviceRequests, 
  profiles,
  serviceImages,
  partsConsumed
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

export const api = {
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  inventory: {
    list: {
      method: 'GET' as const,
      path: '/api/inventory' as const,
      responses: {
        200: z.array(z.custom<typeof inventory.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/inventory' as const,
      input: insertInventorySchema,
      responses: {
        201: z.custom<typeof inventory.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/inventory/:id' as const,
      input: insertInventorySchema.partial(),
      responses: {
        200: z.custom<typeof inventory.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/inventory/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  serviceRequests: {
    list: {
      method: 'GET' as const,
      path: '/api/service-requests' as const,
      responses: {
        200: z.array(z.custom<typeof serviceRequests.$inferSelect & { assignedTo?: { name: string } }>()), 
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/service-requests/:id' as const,
      responses: {
        200: z.custom<typeof serviceRequests.$inferSelect & { images: typeof serviceImages.$inferSelect[], parts: typeof partsConsumed.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/service-requests' as const,
      input: insertServiceRequestSchema,
      responses: {
        201: z.custom<typeof serviceRequests.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/service-requests/:id' as const,
      input: insertServiceRequestSchema.partial().extend({
        status: z.enum(["pending", "accepted", "in_progress", "completed", "billed"]).optional(),
        tentativeServiceDate: z.string().optional(), // ISO string
      }),
      responses: {
        200: z.custom<typeof serviceRequests.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    assign: {
      method: 'PATCH' as const,
      path: '/api/service-requests/:id/assign' as const,
      input: z.object({ engineerId: z.string() }),
      responses: {
        200: z.custom<typeof serviceRequests.$inferSelect>(),
      }
    }
  },
  serviceImages: {
    upload: {
      method: 'POST' as const,
      path: '/api/service-requests/:id/images' as const,
      input: z.object({
        imageUrl: z.string(),
        type: z.enum(['before', 'after'])
      }),
      responses: {
        201: z.custom<typeof serviceImages.$inferSelect>(),
      }
    }
  },
  partsConsumed: {
    add: {
      method: 'POST' as const,
      path: '/api/service-requests/:id/parts' as const,
      input: z.object({
        inventoryId: z.number(),
        quantity: z.number()
      }),
      responses: {
        201: z.custom<typeof partsConsumed.$inferSelect>(),
        400: z.object({ message: z.string() }) // Insufficient stock
      }
    }
  },
  reports: {
    generate: {
      method: 'GET' as const,
      path: '/api/service-requests/:id/report' as const,
      responses: {
        200: z.any(), // PDF stream
      }
    },
    dashboard: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          totalStockValue: z.number(),
          lowStockItems: z.array(z.custom<typeof inventory.$inferSelect>()),
          pendingRequests: z.number(),
          completedRequests: z.number()
        })
      }
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.custom<typeof profiles.$inferSelect>())
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/users' as const,
      input: z.object({
        email: z.string().email(),
        name: z.string(),
        role: z.enum(['admin', 'engineer', 'account'])
      }),
      responses: {
        201: z.custom<typeof profiles.$inferSelect>()
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
