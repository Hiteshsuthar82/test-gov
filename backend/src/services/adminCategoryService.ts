import { Category } from '../models/Category';
import { TestSet } from '../models/TestSet';
import { ISection, ISubsection } from '../models/Category';

export const adminCategoryService = {
  async getAll(query: { page?: number; limit?: number; search?: string }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '10', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [categories, total] = await Promise.all([
      Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Category.countDocuments(filter),
    ]);

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const category = await Category.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  },

  async create(data: {
    name: string;
    description?: string;
    descriptionFormatted?: string;
    bannerImageUrl?: string;
    price: number;
    details?: string;
    detailsFormatted?: string;
    isActive?: boolean;
    sections?: ISection[];
  }) {
    // Validate sections: if there's one section, at least one subsection is required
    if (data.sections && data.sections.length > 0) {
      for (const section of data.sections) {
        if (!section.subsections || section.subsections.length === 0) {
          throw new Error(`Section "${section.name}" must have at least one subsection`);
        }
      }
    }
    return Category.create(data);
  },

  async update(id: string, data: Partial<Parameters<typeof adminCategoryService.create>[0]>) {
    // Validate sections: if there's one section, at least one subsection is required
    if (data.sections && data.sections.length > 0) {
      for (const section of data.sections) {
        if (!section.subsections || section.subsections.length === 0) {
          throw new Error(`Section "${section.name}" must have at least one subsection`);
        }
      }
    }
    const category = await Category.findByIdAndUpdate(id, data, { new: true });
    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  },

  async delete(id: string) {
    const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!category) {
      throw new Error('Category not found');
    }
    return { message: 'Category deactivated' };
  },
};

