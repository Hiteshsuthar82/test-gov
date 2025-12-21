import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISection {
  sectionId: string;
  name: string;
  order: number;
  durationMinutes?: number; // Optional: if set, this section has its own time limit
}

export interface ITestSet extends Document {
  categoryId: Types.ObjectId;
  name: string;
  description?: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarking: number;
  sections: ISection[];
  hasSectionWiseTiming: boolean; // If true, each section has its own timer
  sectionId: string; // Required: section from category
  subsectionId: string; // Required: subsection from category section
  isActive: boolean;
  isFree: boolean; // If true, this test set is free to access
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
  {
    sectionId: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    durationMinutes: { type: Number }, // Optional: time limit for this section
  },
  { _id: false }
);

const TestSetSchema = new Schema<ITestSet>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true },
    description: { type: String },
    durationMinutes: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    negativeMarking: { type: Number, required: true },
    sections: [SectionSchema],
    hasSectionWiseTiming: { type: Boolean, default: false },
    sectionId: { type: String, required: true },
    subsectionId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isFree: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TestSetSchema.index({ categoryId: 1, isActive: 1 });

export const TestSet = mongoose.model<ITestSet>('TestSet', TestSetSchema);

