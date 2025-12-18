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
    sections: Array<{ sectionId: string; name: string; order: number; durationMinutes?: number }>;
    hasSectionWiseTiming?: boolean;
    sectionId: string;
    subsectionId: string;
    isActive?: boolean;
  }) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Validate sectionId and subsectionId
    if (!data.sectionId || !data.subsectionId) {
      throw new Error('Section and Subsection are required');
    }

    // Validate that section exists in category
    const categorySection = category.sections?.find(s => s.sectionId === data.sectionId);
    if (!categorySection) {
      throw new Error('Selected section does not exist in this category');
    }

    // Validate that subsection exists in the selected section
    const subsection = categorySection.subsections?.find(sub => sub.subsectionId === data.subsectionId);
    if (!subsection) {
      throw new Error('Selected subsection does not exist in the selected section');
    }

    // Validate: If section-wise timing is enabled, all sections must have durationMinutes
    if (data.hasSectionWiseTiming) {
      const sectionsWithoutDuration = data.sections.filter(s => !s.durationMinutes || s.durationMinutes <= 0);
      if (sectionsWithoutDuration.length > 0) {
        throw new Error('All sections must have a duration when section-wise timing is enabled');
      }
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

  async update(id: string, data: Partial<Omit<Parameters<typeof adminTestSetService.create>[1], 'sections'>> & { sections?: Array<{ sectionId: string; name: string; order: number; durationMinutes?: number }>; sectionId?: string; subsectionId?: string }) {
    const testSet = await TestSet.findById(id);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    // If sectionId or subsectionId is being updated, validate them
    if (data.sectionId || data.subsectionId) {
      const category = await Category.findById(testSet.categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      const sectionIdToValidate = data.sectionId || testSet.sectionId;
      const subsectionIdToValidate = data.subsectionId || testSet.subsectionId;

      if (sectionIdToValidate && subsectionIdToValidate) {
        // Validate that section exists in category
        const categorySection = category.sections?.find(s => s.sectionId === sectionIdToValidate);
        if (!categorySection) {
          throw new Error('Selected section does not exist in this category');
        }

        // Validate that subsection exists in the selected section
        const subsection = categorySection.subsections?.find(sub => sub.subsectionId === subsectionIdToValidate);
        if (!subsection) {
          throw new Error('Selected subsection does not exist in the selected section');
        }
      }
    }

    // Validate: If section-wise timing is enabled, all sections must have durationMinutes
    if (data.hasSectionWiseTiming !== undefined && data.hasSectionWiseTiming) {
      const sections = data.sections || testSet.sections || [];
      const sectionsWithoutDuration = sections.filter(s => !s.durationMinutes || s.durationMinutes <= 0);
      if (sectionsWithoutDuration.length > 0) {
        throw new Error('All sections must have a duration when section-wise timing is enabled');
      }
    }

    const updatedTestSet = await TestSet.findByIdAndUpdate(id, data, { new: true });
    return updatedTestSet;
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

