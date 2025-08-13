
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  isSubscribed: boolean;
  postsCount: number;
  maxPosts: number;
  canCreatePost: boolean;
  incrementPostCount: () => void;
  resetPostCount: () => void;
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
  const maxPosts = isSubscribed ? 999 : 3; // Unlimited for subscribers, 3 for free users
  const canCreatePost = postsCount < maxPosts;

  useEffect(() => {
    if (user) {
      // Check subscription status from your backend/Stripe
      // This is a placeholder - implement actual Stripe subscription check
      checkSubscriptionStatus();
      loadPostsCount();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    // Implement Stripe subscription check
    setIsSubscribed(false); // Placeholder
  };

  const loadPostsCount = async () => {
    // Load from AsyncStorage or your database
    const currentMonth = new Date().getMonth();
    // Implement logic to track monthly posts
    setPostsCount(0); // Placeholder
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
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
