import { Partner } from '../models/Partner';

export const partnerService = {
  async validateCode(code: string) {
    const partner = await Partner.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });
    return partner;
  },

  async getAll() {
    return Partner.find().sort({ createdAt: -1 });
  },

  async getById(id: string) {
    const partner = await Partner.findById(id);
    if (!partner) {
      throw new Error('Partner not found');
    }
    return partner;
  },

  async create(data: {
    name: string;
    businessName: string;
    mobile: string;
    code: string;
    discountPercentage: number;
  }) {
    // Check if code already exists
    const existingPartner = await Partner.findOne({ 
      code: data.code.toUpperCase() 
    });
    if (existingPartner) {
      throw new Error('Partner code already exists');
    }

    const partner = await Partner.create({
      ...data,
      code: data.code.toUpperCase(),
    });
    return partner;
  },

  async update(id: string, data: {
    name?: string;
    businessName?: string;
    mobile?: string;
    code?: string;
    discountPercentage?: number;
    isActive?: boolean;
  }) {
    // If code is being updated, check if it already exists
    if (data.code) {
      const existingPartner = await Partner.findOne({ 
        code: data.code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existingPartner) {
        throw new Error('Partner code already exists');
      }
      data.code = data.code.toUpperCase();
    }

    const partner = await Partner.findByIdAndUpdate(id, data, { new: true });
    if (!partner) {
      throw new Error('Partner not found');
    }
    return partner;
  },

  async delete(id: string) {
    const partner = await Partner.findByIdAndDelete(id);
    if (!partner) {
      throw new Error('Partner not found');
    }
    return partner;
  },
};

