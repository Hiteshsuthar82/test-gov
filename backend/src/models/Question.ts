import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOption {
  optionId: string;
  text: string;
  imageUrl?: string;
}

export interface ILanguageContent {
  direction?: string;
  directionFormattedText?: string;
  directionImageUrl?: string;
  questionText: string;
  questionFormattedText?: string;
  questionImageUrl?: string;
  conclusion?: string;
  conclusionFormattedText?: string;
  conclusionImageUrl?: string;
  options: IOption[];
  explanationText?: string;
  explanationFormattedText?: string;
  explanationImageUrls?: string[];
}

export interface IQuestion extends Document {
  testSetId: Types.ObjectId;
  sectionId?: string;
  // Multi-language support: en (required), hi (optional), gu (optional)
  languages: {
    en: ILanguageContent;
    hi?: ILanguageContent;
    gu?: ILanguageContent;
  };
  correctOptionId: string;
  marks: number;
  averageTimeSeconds?: number; // Average time in seconds expected to solve this question
  questionOrder: number;
  tags?: string[]; // Tags array for questions
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IOption>(
  {
    optionId: { type: String, required: true },
    text: { type: String, required: true },
    imageUrl: { type: String },
  },
  { _id: false }
);

const LanguageContentSchema = new Schema<ILanguageContent>(
  {
    direction: { type: String },
    directionFormattedText: { type: String },
    directionImageUrl: { type: String },
    questionText: { type: String, required: true },
    questionFormattedText: { type: String },
    questionImageUrl: { type: String },
    conclusion: { type: String },
    conclusionFormattedText: { type: String },
    conclusionImageUrl: { type: String },
    options: { type: [OptionSchema], required: true, minlength: 2 },
    explanationText: { type: String },
    explanationFormattedText: { type: String },
    explanationImageUrls: { type: [String], default: [] },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    testSetId: { type: Schema.Types.ObjectId, ref: 'TestSet', required: true },
    sectionId: { type: String, required: false },
    // Multi-language support
    languages: {
      type: {
        en: { type: LanguageContentSchema, required: true },
        hi: { type: LanguageContentSchema, required: false },
        gu: { type: LanguageContentSchema, required: false },
      },
      required: true,
    },
    correctOptionId: { type: String, required: true },
    marks: { type: Number, default: 1 },
    averageTimeSeconds: { type: Number },
    questionOrder: { type: Number, required: true },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

QuestionSchema.index({ testSetId: 1, questionOrder: 1 });
QuestionSchema.index({ testSetId: 1, sectionId: 1 }, { sparse: true });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

