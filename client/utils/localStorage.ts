import AsyncStorage from '@react-native-async-storage/async-storage';

// 本地存储工具函数
export const localStorage = {
  // 获取所有数据
  getAll: async <T>(key: string): Promise<T[]> => {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return [];
    }
  },

  // 保存所有数据
  saveAll: async <T>(key: string, data: T[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  },

  // 添加单条数据
  add: async <T extends { id?: string }>(key: string, item: T): Promise<T> => {
    try {
      const data = await localStorage.getAll<T>(key);
      const newItem = { ...item, id: item.id || Date.now().toString() };
      data.push(newItem);
      await localStorage.saveAll(key, data);
      return newItem;
    } catch (error) {
      console.error(`Error adding to ${key}:`, error);
      return item;
    }
  },

  // 更新单条数据
  update: async <T extends { id: string }>(key: string, id: string, updates: Partial<T>): Promise<T | null> => {
    try {
      const data = await localStorage.getAll<T>(key);
      const index = data.findIndex(item => item.id === id);
      if (index === -1) return null;
      
      data[index] = { ...data[index], ...updates };
      await localStorage.saveAll(key, data);
      return data[index];
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      return null;
    }
  },

  // 删除单条数据
  delete: async (key: string, id: string): Promise<boolean> => {
    try {
      const data = await localStorage.getAll<any>(key);
      const filtered = data.filter(item => item.id !== id);
      await localStorage.saveAll(key, filtered);
      return true;
    } catch (error) {
      console.error(`Error deleting from ${key}:`, error);
      return false;
    }
  },

  // 清空数据
  clear: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error clearing ${key}:`, error);
    }
  }
};

// 存储键名
export const STORAGE_KEYS = {
  TRANSACTIONS: 'transactions',
  DAILY_PLANS: 'daily_plans',
  SCHEDULE: 'schedule',
  PLAN_ITEMS: 'plan_items',
  GOALS: 'goals',
  SUB_GOALS: 'sub_goals',
  DAILY_REVIEWS: 'daily_reviews',
  ENGLISH_NOTES: 'english_notes',
  READING_NOTES: 'reading_notes',
  AI_LEARNING_NOTES: 'ai_learning_notes',
  WORKOUT: 'workout',
  WORKOUT_PLANS: 'workout_plans',
  MONEY_INSIGHTS: 'money_insights'
};
