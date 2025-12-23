import mongoose, { Schema, Document } from 'mongoose';

export interface ITimePeriod {
  months: number;
  price: number;
  originalPrice: number;
}

export interface ISubsection {
  subsectionId: string;
  name: string;
  order: number;
}

export interface ISection {
  sectionId: string;
  name: string;
  order: number;
  subsections: ISubsection[];
}

export interface ICategory extends Document {
  name: string;
  description?: string;
  descriptionFormatted?: string;
  bannerImageUrl?: string;
  price: number; // Deprecated - use timePeriods instead, kept for backward compatibility
  originalPrice?: number; // Optional original price for backward compatibility
  timePeriods?: ITimePeriod[]; // Dynamic pricing based on subscription duration
  details?: string;
  detailsFormatted?: string;
  isActive: boolean;
  totalSetsCount: number;
  sections: ISection[];
  createdAt: Date;
  updatedAt: Date;
}

const TimePeriodSchema = new Schema<ITimePeriod>(
  {
    months: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SubsectionSchema = new Schema<ISubsection>(
  {
    subsectionId: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const SectionSchema = new Schema<ISection>(
  {
    sectionId: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    subsections: { type: [SubsectionSchema], required: true, default: [] },
  },
  { _id: false }
);

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    descriptionFormatted: { type: String },
    bannerImageUrl: { type: String },
    price: { type: Number, required: true }, // Keep as required for backward compatibility
    originalPrice: { type: Number }, // Optional original price
    timePeriods: [TimePeriodSchema], // Dynamic pricing periods
    details: { type: String },
    detailsFormatted: { type: String },
    isActive: { type: Boolean, default: true },
    totalSetsCount: { type: Number, default: 0 },
    sections: { type: [SectionSchema], default: [] },
  },
  { timestamps: true }
);

// Validation: If there's one section, at least one subsection is required
CategorySchema.pre('save', function(next) {
  if (this.sections && this.sections.length > 0) {
    for (const section of this.sections) {
      if (!section.subsections || section.subsections.length === 0) {
        return next(new Error(`Section "${section.name}" must have at least one subsection`));
      }
    }
  }
  next();
});

CategorySchema.index({ isActive: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);

