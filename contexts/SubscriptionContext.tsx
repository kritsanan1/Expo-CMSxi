
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { checkUserSubscription, getUserPostCount } from '@/lib/api';

interface SubscriptionContextType {
  isSubscribed: boolean;
  postsCount: number;
  maxPosts: number;
  canCreatePost: boolean;
  incrementPostCount: () => void;
  resetPostCount: () => void;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({} as SubscriptionContextType);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const maxPosts = isSubscribed ? 999 : 5; // 5 posts for free users, unlimited for subscribers
  const canCreatePost = postsCount < maxPosts;

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check subscription status
      const subscriptionResult = await checkUserSubscription(user.id);
      setIsSubscribed(subscriptionResult.isSubscribed);

      // Get current month's post count
      const postCountResult = await getUserPostCount(user.id);
      setPostsCount(postCountResult.count);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementPostCount = () => {
    setPostsCount(prev => prev + 1);
  };

  const resetPostCount = () => {
    setPostsCount(0);
  };

  const value = {
    isSubscribed,
    postsCount,
    maxPosts,
    canCreatePost,
    incrementPostCount,
    resetPostCount,
    loading,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
