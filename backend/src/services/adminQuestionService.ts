import { Question, ILanguageContent } from '../models/Question';
import { TestSet } from '../models/TestSet';
import { Types } from 'mongoose';

export const adminQuestionService = {
  async getByTestSet(testSetId: string) {
    return Question.find({ testSetId: new Types.ObjectId(testSetId) })
      .sort({ questionOrder: 1 });
  },

  async getById(id: string) {
    const question = await Question.findById(id).populate('testSetId', 'name');
    if (!question) {
      throw new Error('Question not found');
    }
    return question;
  },

  async create(testSetId: string, data: {
    sectionId?: string;
    languages: {
      en: ILanguageContent;
      hi?: ILanguageContent;
      gu?: ILanguageContent;
    };
    correctOptionId: string;
    marks?: number;
    questionOrder: number;
    tags?: string[];
    isActive?: boolean;
    averageTimeSeconds?: number;
  }) {
    const testSet = await TestSet.findById(testSetId);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    // Validate sectionId only if sections exist in testSet
    if (testSet.sections && testSet.sections.length > 0) {
      if (!data.sectionId) {
        throw new Error('Section ID is required when sections exist in test set');
      }
      // Validate sectionId exists in testSet
      const sectionExists = testSet.sections.some((s) => s.sectionId === data.sectionId);
      if (!sectionExists) {
        throw new Error('Section ID not found in test set');
      }
    } else {
      // If no sections exist, sectionId should not be provided
      if (data.sectionId) {
        throw new Error('Section ID should not be provided when test set has no sections');
      }
    }

    // Validate that English (en) is provided
    if (!data.languages || !data.languages.en || !data.languages.en.questionText || !data.languages.en.options || data.languages.en.options.length < 2) {
      throw new Error('English (en) language content is required with questionText and at least 2 options');
    }

    const questionData: any = {
      testSetId: new Types.ObjectId(testSetId),
      languages: data.languages,
      correctOptionId: data.correctOptionId,
      marks: data.marks || 1,
      questionOrder: data.questionOrder,
      tags: data.tags || [],
      isActive: data.isActive ?? true,
    };

    if (data.sectionId) {
      questionData.sectionId = data.sectionId;
    }
    if (data.averageTimeSeconds !== undefined) {
      questionData.averageTimeSeconds = data.averageTimeSeconds;
    }

    return Question.create(questionData);
  },

  async update(id: string, data: Partial<{
    sectionId?: string;
    languages: {
      en: ILanguageContent;
      hi?: ILanguageContent;
      gu?: ILanguageContent;
    };
    correctOptionId: string;
    marks?: number;
    questionOrder: number;
    tags?: string[];
    isActive?: boolean;
    averageTimeSeconds?: number;
  }>) {
    const question = await Question.findById(id);
    if (!question) {
      throw new Error('Question not found');
    }

    // Get the test set to validate sectionId if it's being updated
    if (data.sectionId !== undefined) {
      const testSet = await TestSet.findById(question.testSetId);
      if (!testSet) {
        throw new Error('Test set not found');
      }

      // Validate sectionId only if sections exist in testSet
      if (testSet.sections && testSet.sections.length > 0) {
        if (!data.sectionId) {
          throw new Error('Section ID is required when sections exist in test set');
        }
        // Validate sectionId exists in testSet
        const sectionExists = testSet.sections.some((s) => s.sectionId === data.sectionId);
        if (!sectionExists) {
          throw new Error('Section ID not found in test set');
        }
      } else {
        // If no sections exist, sectionId should not be provided
        if (data.sectionId) {
          throw new Error('Section ID should not be provided when test set has no sections');
        }
      }
    }

    // Get existing languages to merge
    const existingLanguages = question.languages ? question.languages : { en: {} as ILanguageContent };

    // Build update data
    const updateData: any = {};

    if (data.languages) {
      // Merge with existing languages
      const langData = data.languages as { en?: ILanguageContent; hi?: ILanguageContent; gu?: ILanguageContent };
      updateData.languages = {
        en: langData.en || existingLanguages.en,
        hi: langData.hi !== undefined ? langData.hi : existingLanguages.hi,
        gu: langData.gu !== undefined ? langData.gu : existingLanguages.gu,
      };
    }

    // Add other fields
    if (data.correctOptionId !== undefined) updateData.correctOptionId = data.correctOptionId;
    if (data.marks !== undefined) updateData.marks = data.marks;
    if (data.questionOrder !== undefined) updateData.questionOrder = data.questionOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.averageTimeSeconds !== undefined) updateData.averageTimeSeconds = data.averageTimeSeconds;
    if (data.sectionId !== undefined) updateData.sectionId = data.sectionId;
    if (data.tags !== undefined) updateData.tags = data.tags;

    const updatedQuestion = await Question.findByIdAndUpdate(id, updateData, { new: true });
    return updatedQuestion;
  },

  async delete(id: string) {
    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      throw new Error('Question not found');
    }
    return { message: 'Question deleted' };
  },

  async bulkCreate(testSetId: string, questions: Array<{
    sectionId?: string;
    languages: {
      en: ILanguageContent;
      hi?: ILanguageContent;
      gu?: ILanguageContent;
    };
    correctOptionId: string;
    marks?: number;
    questionOrder: number;
    tags?: string[];
    isActive?: boolean;
    averageTimeSeconds?: number;
  }>) {
    const testSet = await TestSet.findById(testSetId);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    const createdQuestions = await Question.insertMany(
      questions.map((q) => ({
        testSetId: new Types.ObjectId(testSetId),
        ...q,
      }))
    );

    return createdQuestions;
  },

  async getTestSetForValidation(testSetId: string) {
    const testSet = await TestSet.findById(testSetId);
    if (!testSet) {
      throw new Error('Test set not found');
    }
    return testSet;
  },
};

