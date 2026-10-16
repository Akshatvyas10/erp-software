export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (params?: Record<string, any>) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  students: {
    all: ['students'] as const,
    list: (params?: Record<string, any>) => ['students', 'list', params] as const,
    detail: (id: string) => ['students', 'detail', id] as const,
  },
  teachers: {
    all: ['teachers'] as const,
    list: (params?: Record<string, any>) => ['teachers', 'list', params] as const,
    detail: (id: string) => ['teachers', 'detail', id] as const,
  },
  classrooms: {
    all: ['classrooms'] as const,
    list: (params?: Record<string, any>) => ['classrooms', 'list', params] as const,
    detail: (id: string) => ['classrooms', 'detail', id] as const,
  },
  subjects: {
    all: ['subjects'] as const,
    list: () => ['subjects', 'list'] as const,
  },
  homeworks: {
    all: ['homeworks'] as const,
    detail: (id: string) => ['homeworks', 'detail', id] as const,
  },
  events: {
    all: ['events'] as const,
  },
} as const;

export default queryKeys;
