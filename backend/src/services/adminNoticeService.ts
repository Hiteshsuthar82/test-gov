import { Notice } from '../models/Notice';

export const adminNoticeService = {
  async getAll() {
    return Notice.find().sort({ sortOrder: 1, createdAt: -1 });
  },

  async create(data: {
    title: string;
    description: string;
    linkUrl?: string;
    linkText?: string;
    isActive?: boolean;
    validFrom?: Date;
    validTo?: Date;
    sortOrder?: number;
  }) {
    return Notice.create(data);
  },

  async update(id: string, data: Partial<Parameters<typeof adminNoticeService.create>[0]>) {
    const notice = await Notice.findByIdAndUpdate(id, data, { new: true });
    if (!notice) {
      throw new Error('Notice not found');
    }
    return notice;
  },

  async delete(id: string) {
    const notice = await Notice.findByIdAndDelete(id);
    if (!notice) {
      throw new Error('Notice not found');
    }
    return { message: 'Notice deleted' };
  },
};

