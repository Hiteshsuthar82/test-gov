import { ComboOffer } from '../models/ComboOffer';
import { Category } from '../models/Category';
import { Types } from 'mongoose';

export const comboOfferService = {
  async getAll(query: { page?: number; limit?: number; isActive?: boolean }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const [comboOffers, total] = await Promise.all([
      ComboOffer.find(filter)
        .populate('categoryIds', 'name price bannerImageUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ComboOffer.countDocuments(filter),
    ]);

    return {
      comboOffers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getActiveOffersForCategory(categoryId: string) {
    const now = new Date();
    
    // Date validation logic:
    // - validFrom and validTo are optional
    // - If validFrom exists: current date must be >= validFrom (offer has started)
    // - If validTo exists: current date must be <= validTo (offer hasn't ended)
    // - If both exist: current date must be between validFrom and validTo (inclusive)
    // - If neither exists: no date restriction
    
    const offers = await ComboOffer.find({
      isActive: true,
      categoryIds: new Types.ObjectId(categoryId),
      $and: [
        {
          // Either validFrom doesn't exist, or current date is >= validFrom
          $or: [
            { validFrom: null },
            { validFrom: { $lte: now } }, // validFrom <= now means now >= validFrom
          ],
        },
        {
          // Either validTo doesn't exist, or current date is <= validTo
          $or: [
            { validTo: null },
            { validTo: { $gte: now } }, // validTo >= now means now <= validTo
          ],
        },
      ],
    })
      .populate('categoryIds', 'name price bannerImageUrl')
      .sort({ createdAt: -1 });

    // Sort time periods by months for each offer
    offers.forEach((offer: any) => {
      if (offer.timePeriods && offer.timePeriods.length > 0) {
        offer.timePeriods.sort((a: any, b: any) => a.months - b.months);
      }
    });

    return offers;
  },

  async getById(id: string) {
    const comboOffer = await ComboOffer.findById(id)
      .populate('categoryIds', 'name price bannerImageUrl');
    if (!comboOffer) {
      throw new Error('Combo offer not found');
    }
    // Sort time periods by months (ascending) for consistent display
    if (comboOffer.timePeriods && comboOffer.timePeriods.length > 0) {
      comboOffer.timePeriods.sort((a: any, b: any) => a.months - b.months);
    }
    return comboOffer;
  },

  async create(data: {
    name: string;
    description?: string;
    imageUrl?: string;
    categoryIds: string[];
    price?: number;
    originalPrice?: number;
    timePeriods?: Array<{ months: number; price: number; originalPrice: number }>;
    benefits: string[];
    validFrom?: Date;
    validTo?: Date;
    isActive?: boolean;
  }) {
    // Validate categories exist
    const categories = await Category.find({
      _id: { $in: data.categoryIds.map(id => new Types.ObjectId(id)) },
    });

    if (categories.length !== data.categoryIds.length) {
      throw new Error('One or more categories not found');
    }

    // Validate that either timePeriods or price/originalPrice is provided
    if (!data.timePeriods || data.timePeriods.length === 0) {
      if (!data.price || !data.originalPrice) {
        throw new Error('Either timePeriods or price/originalPrice must be provided');
      }
    }

    const comboOffer = await ComboOffer.create({
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      categoryIds: data.categoryIds.map(id => new Types.ObjectId(id)),
      price: data.price,
      originalPrice: data.originalPrice,
      timePeriods: data.timePeriods,
      benefits: data.benefits,
      validFrom: data.validFrom,
      validTo: data.validTo,
      isActive: data.isActive ?? true,
    });

    const saved = await ComboOffer.findById(comboOffer._id)
      .populate('categoryIds', 'name price bannerImageUrl');
    // Sort time periods by months (ascending)
    if (saved && saved.timePeriods && saved.timePeriods.length > 0) {
      saved.timePeriods.sort((a: any, b: any) => a.months - b.months);
    }
    return saved;
  },

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    categoryIds: string[];
    price: number;
    originalPrice: number;
    timePeriods: Array<{ months: number; price: number; originalPrice: number }>;
    benefits: string[];
    validFrom: Date;
    validTo: Date;
    isActive: boolean;
  }>) {
    const comboOffer = await ComboOffer.findById(id);
    if (!comboOffer) {
      throw new Error('Combo offer not found');
    }

    // Validate categories if being updated
    if (data.categoryIds) {
      const categories = await Category.find({
        _id: { $in: data.categoryIds.map(id => new Types.ObjectId(id)) },
      });

      if (categories.length !== data.categoryIds.length) {
        throw new Error('One or more categories not found');
      }

      Object.assign(comboOffer, {
        ...data,
        categoryIds: data.categoryIds.map(id => new Types.ObjectId(id)),
      });
    } else {
      Object.assign(comboOffer, data);
    }
    await comboOffer.save();

    const updated = await ComboOffer.findById(comboOffer._id)
      .populate('categoryIds', 'name price bannerImageUrl');
    // Sort time periods by months (ascending)
    if (updated && updated.timePeriods && updated.timePeriods.length > 0) {
      updated.timePeriods.sort((a: any, b: any) => a.months - b.months);
    }
    return updated;
  },

  async delete(id: string) {
    const comboOffer = await ComboOffer.findByIdAndDelete(id);
    if (!comboOffer) {
      throw new Error('Combo offer not found');
    }
    return { message: 'Combo offer deleted' };
  },
};

