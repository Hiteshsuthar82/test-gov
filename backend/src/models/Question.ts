import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOption {
  optionId: string;
  text: string;
  imageUrl?: string;
}

export interface IQuestion extends Document {
  testSetId: Types.ObjectId;
  sectionId: string;
  direction?: string; // Text before question text
  directionImageUrl?: string; // Image for direction
  questionText: string;
  questionImageUrl?: string;
  conclusion?: string; // Text after question text
  conclusionImageUrl?: string; // Image for conclusion
  options: IOption[];
  correctOptionId: string;
  marks: number;
  explanationText?: string; // Plain text explanation
  explanationFormattedText?: string; // Formatted HTML explanation
  explanationImageUrls?: string[]; // Changed from explanationImageUrl to array
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
    sectionId: { type: String, required: true },
    direction: { type: String },
    directionImageUrl: { type: String },
    questionText: { type: String, required: true },
    questionImageUrl: { type: String },
    conclusion: { type: String },
    conclusionImageUrl: { type: String },
    options: { type: [OptionSchema], required: true, minlength: 2, maxlength: 5 },
    correctOptionId: { type: String, required: true },
    marks: { type: Number, default: 1 },
    explanationText: { type: String },
    explanationFormattedText: { type: String },
    explanationImageUrls: { type: [String], default: [] }, // Changed to array
    questionOrder: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

QuestionSchema.index({ testSetId: 1, questionOrder: 1 });
QuestionSchema.index({ testSetId: 1, sectionId: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

