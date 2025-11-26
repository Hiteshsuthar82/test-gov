import { TestSet } from '../models/TestSet';
import { Category } from '../models/Category';
import { Types } from 'mongoose';

export const adminTestSetService = {
  async getByCategory(categoryId: string) {
    return TestSet.find({ categoryId: new Types.ObjectId(categoryId) })
      .sort({ createdAt: 1 });
  },

  async getById(id: string) {
    const testSet = await TestSet.findById(id).populate('categoryId', 'name');
    if (!testSet) {
      throw new Error('Test set not found');
    }
    // Convert to plain object and ensure categoryId is included as both object and string
    const result = testSet.toObject();
    if (result.categoryId && typeof result.categoryId === 'object') {
      // Keep the populated object but also add the ID as a string for easier access
      result.categoryIdString = result.categoryId._id.toString();
    }
    return result;
  },

  async create(categoryId: string, data: {
    name: string;
    description?: string;
    durationMinutes: number;
    totalMarks: number;
    negativeMarking: number;
    sections: Array<{ sectionId: string; name: string; order: number }>;
    isActive?: boolean;
  }) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const testSet = await TestSet.create({
      categoryId: new Types.ObjectId(categoryId),
      ...data,
    });

    // Update category totalSetsCount
    category.totalSetsCount = await TestSet.countDocuments({
      categoryId: new Types.ObjectId(categoryId),
      isActive: true,
    });
    await category.save();

    return testSet;
  },

  async update(id: string, data: Partial<Omit<Parameters<typeof adminTestSetService.create>[1], 'sections'>> & { sections?: Array<{ sectionId: string; name: string; order: number }> }) {
    const testSet = await TestSet.findByIdAndUpdate(id, data, { new: true });
    if (!testSet) {
      throw new Error('Test set not found');
    }
    return testSet;
  },

  async delete(id: string) {
    const testSet = await TestSet.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!testSet) {
      throw new Error('Test set not found');
    }

    // Update category totalSetsCount
    const category = await Category.findById(testSet.categoryId);
    if (category) {
      category.totalSetsCount = await TestSet.countDocuments({
        categoryId: testSet.categoryId,
        isActive: true,
      });
      await category.save();
    }

    return { message: 'Test set deactivated' };
  },
};

