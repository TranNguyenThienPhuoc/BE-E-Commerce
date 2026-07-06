import { Hono } from 'hono';
import { Container } from '@/infrastructure/dependencies/Container';
import { validateUserId } from '@/utils/validation';
import { requireAuth, requireAdmin } from '@/infrastructure/middleware/auth';

export function setupUserRoutes(app: Hono) {
  const container = Container.getInstance();
  const userController = container.getUserController();

  app.get('/api/users',
    requireAuth(),
    requireAdmin(),
    (c) => userController.listUsers(c)
  );

  app.get('/api/users/:id', 
    validateUserId(),
    (c) => userController.getUser(c)
  );

  app.post('/api/users/seller-register',
    requireAuth(),
    (c) => userController.registerSeller(c)
  );

  app.get('/api/admin/sellers/pending',
    requireAuth(),
    requireAdmin(),
    (c) => userController.listPendingSellers(c)
  );

  app.post('/api/admin/sellers/:id/approve',
    requireAuth(),
    requireAdmin(),
    (c) => userController.approveSeller(c)
  );

  app.post('/api/admin/sellers/:id/reject',
    requireAuth(),
    requireAdmin(),
    (c) => userController.rejectSeller(c)
  );
}