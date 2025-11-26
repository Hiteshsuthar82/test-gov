import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISection {
  sectionId: string;
  name: string;
  order: number;
}

export interface ITestSet extends Document {
  categoryId: Types.ObjectId;
  name: string;
  description?: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarking: number;
  sections: ISection[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
  {
    sectionId: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
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
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TestSetSchema.index({ categoryId: 1, isActive: 1 });

export const TestSet = mongoose.model<ITestSet>('TestSet', TestSetSchema);

