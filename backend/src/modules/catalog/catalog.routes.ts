import { Router } from 'express';
import { catalogController } from './catalog.controller';
import { authenticate, authorize } from '../auth/auth.middleware';

const router = Router();

// Public routes
router.get('/products', catalogController.getProducts);
router.get('/products/search', catalogController.getProducts);
router.get('/products/seller/mine', authenticate, authorize('seller'), catalogController.getMyProducts);
router.get('/products/:idOrSlug', catalogController.getProduct);
router.get('/categories', catalogController.getCategories);

// Seller routes
router.post('/products', authenticate, authorize('seller'), catalogController.createProduct);
router.put('/products/:id', authenticate, authorize('seller'), catalogController.updateProduct);
router.delete('/products/:id', authenticate, authorize('seller'), catalogController.deleteProduct);
router.patch('/products/:id/publish', authenticate, authorize('seller'), catalogController.publishProduct);
router.patch('/products/:id/unpublish', authenticate, authorize('seller'), catalogController.unpublishProduct);

// Admin routes
router.post('/categories', authenticate, authorize('admin'), catalogController.createCategory);
router.put('/categories/:id', authenticate, authorize('admin'), catalogController.updateCategory);
router.delete('/categories/:id', authenticate, authorize('admin'), catalogController.deleteCategory);

export default router;
