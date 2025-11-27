import { Question } from '../models/Question';
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
    sectionId: string;
    questionText: string;
    questionImageUrl?: string;
    options: Array<{ optionId: string; text: string; imageUrl?: string }>;
    correctOptionId: string;
    marks?: number;
    explanationText?: string;
    explanationImageUrls?: string[]; // Changed to array
    questionOrder: number;
    isActive?: boolean;
  }) {
    const testSet = await TestSet.findById(testSetId);
    if (!testSet) {
      throw new Error('Test set not found');
    }

    // Validate sectionId exists in testSet
    const sectionExists = testSet.sections.some((s) => s.sectionId === data.sectionId);
    if (!sectionExists) {
      throw new Error('Section ID not found in test set');
    }

    return Question.create({
      testSetId: new Types.ObjectId(testSetId),
      ...data,
    });
  },

  async update(id: string, data: Partial<Omit<Parameters<typeof adminQuestionService.create>[1], 'testSetId'>>) {
    const question = await Question.findByIdAndUpdate(id, data, { new: true });
    if (!question) {
      throw new Error('Question not found');
    }
    return question;
  },

  async delete(id: string) {
    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      throw new Error('Question not found');
    }
    return { message: 'Question deleted' };
  },

  async bulkCreate(testSetId: string, questions: Parameters<typeof adminQuestionService.create>[1][]) {
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
};

