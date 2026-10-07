import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const productRouter = Router();

productRouter.get('/search', authMiddleware, ProductController.search);
productRouter.get('/quick-buttons', authMiddleware, ProductController.getQuickButtons);
productRouter.get('/categories', authMiddleware, ProductController.getCategories);
productRouter.get('/suppliers', authMiddleware, ProductController.getSuppliers);
productRouter.get('/', authMiddleware, ProductController.getAll);
productRouter.post('/', authMiddleware, requireAdmin, ProductController.create);
productRouter.put('/:id', authMiddleware, requireAdmin, ProductController.update);
productRouter.delete('/:id', authMiddleware, requireAdmin, ProductController.delete);
