import { EventEmitter } from 'events';

/**
 * Central event bus for permission-related events.
 *
 * Events emitted:
 *   'user:login'   → { userId: UUID, sessionId: string }
 *   'user:logout'  → { userId: UUID, sessionId: string }
 *   'user:refresh' → { userId: UUID }
 *   'role:changed' → { userId: UUID }   (fired when roles/permissions are mutated)
 */
const permissionEmitter = new EventEmitter();

// Prevent memory-leak warnings for large numbers of listeners
permissionEmitter.setMaxListeners(20);

export default permissionEmitter;
