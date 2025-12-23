import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/mock-test-app';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
    
    // Drop the problematic userId_1_comboOfferId_1 index if it exists
    // This index was causing duplicate key errors when creating multiple category subscriptions
    try {
      const db = mongoose.connection.db;
      const subscriptionsCollection = db?.collection('subscriptions');
      if (subscriptionsCollection) {
        const indexes = await subscriptionsCollection.indexes();
        const problematicIndex = indexes.find(
          (idx: any) => idx.name === 'userId_1_comboOfferId_1'
        );
        if (problematicIndex) {
          console.log('Dropping problematic index: userId_1_comboOfferId_1');
          await subscriptionsCollection.dropIndex('userId_1_comboOfferId_1');
          console.log('Successfully dropped userId_1_comboOfferId_1 index');
        } else {
          console.log('Index userId_1_comboOfferId_1 not found (already removed or never existed)');
        }
      }
    } catch (indexError: any) {
      // If index doesn't exist or can't be dropped, that's okay - just log it
      if (indexError.code !== 27) { // 27 is "IndexNotFound" error code
        console.warn('Warning: Could not drop index userId_1_comboOfferId_1:', indexError.message);
      }
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

