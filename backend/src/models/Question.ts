import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOption {
  optionId: string;
  text: string;
  imageUrl?: string;
}

export interface IQuestion extends Document {
  testSetId: Types.ObjectId;
  sectionId?: string;
  direction?: string;
  directionImageUrl?: string;
  questionText: string;
  questionFormattedText?: string;
  questionImageUrl?: string;
  conclusion?: string;
  conclusionImageUrl?: string;
  options: IOption[];
  correctOptionId: string;
  marks: number;
  explanationText?: string;
  explanationFormattedText?: string;
  explanationImageUrl?: string; // Legacy field for backward compatibility
  explanationImageUrls?: string[]; // New field for multiple images
  questionOrder: number;
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

const QuestionSchema = new Schema<IQuestion>(
  {
    testSetId: { type: Schema.Types.ObjectId, ref: 'TestSet', required: true },
    sectionId: { type: String, required: false },
    direction: { type: String },
    directionImageUrl: { type: String },
    questionText: { type: String, required: true },
    questionFormattedText: { type: String },
    questionImageUrl: { type: String },
    conclusion: { type: String },
    conclusionImageUrl: { type: String },
    options: { type: [OptionSchema], required: true, minlength: 2 },
    correctOptionId: { type: String, required: true },
    marks: { type: Number, default: 1 },
    explanationText: { type: String },
    explanationFormattedText: { type: String },
    explanationImageUrl: { type: String }, // Legacy field for backward compatibility
    explanationImageUrls: { type: [String], default: [] }, // New field for multiple images
    questionOrder: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

QuestionSchema.index({ testSetId: 1, questionOrder: 1 });
QuestionSchema.index({ testSetId: 1, sectionId: 1 }, { sparse: true });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

