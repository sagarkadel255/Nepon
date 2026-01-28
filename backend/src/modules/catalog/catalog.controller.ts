import { Request, Response, NextFunction } from 'express';
import { catalogService } from './catalog.service';

export class CatalogController {
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await catalogService.getProducts(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }

  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const idOrSlug = req.params.idOrSlug as string;
      const product = await catalogService.getProductByIdOrSlug(idOrSlug);
      res.json(product);
    } catch (error) { next(error); }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id as string;
      const product = await catalogService.createProduct(req.body, userId);
      res.status(201).json(product);
    } catch (error) { next(error); }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const product = await catalogService.updateProduct(id, req.body, (req as any).user._id);
      res.json(product);
    } catch (error) { next(error); }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await catalogService.deleteProduct(id, (req as any).user._id);
      res.json({ message: 'Product deleted' });
    } catch (error) { next(error); }
  }

  async publishProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const product = await catalogService.publishProduct(id, (req as any).user._id);
      res.json(product);
    } catch (error) { next(error); }
  }

  async unpublishProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const product = await catalogService.unpublishProduct(id, (req as any).user._id);
      res.json(product);
    } catch (error) { next(error); }
  }

  async getMyProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const result = await catalogService.getMyProducts(userId, page, limit);
      res.json(result);
    } catch (error) { next(error); }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await catalogService.getCategories();
      res.json(categories);
    } catch (error) { next(error); }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await catalogService.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) { next(error); }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const category = await catalogService.updateCategory(id, req.body);
      res.json(category);
    } catch (error) { next(error); }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await catalogService.deleteCategory(id);
      res.json({ message: 'Category deleted' });
    } catch (error) { next(error); }
  }
}

export const catalogController = new CatalogController();
