
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const AYRSHARE_API_KEY = process.env.EXPO_PUBLIC_AYRSHARE_API_KEY;

// Social Media Analytics Types
export interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'linkedin';
  content: string;
  post_url: string;
  published_at: string;
  metrics: {
    likes: number;
    shares: number;
    comments: number;
    impressions: number;
    engagement_rate: number;
  };
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TrendingTopic {
  topic: string;
  volume: number;
  category: string;
  suggested_content: string;
  hashtags: string[];
}

export interface AnalyticsSummary {
  totalPosts: number;
  totalEngagement: number;
  averageEngagementRate: number;
  topPerformingPost: SocialMediaPost | null;
  platformBreakdown: {
    twitter: { posts: number; engagement: number };
    linkedin: { posts: number; engagement: number };
  };
  weeklyTrends: Array<{
    week: string;
    posts: number;
    engagement: number;
  }>;
}

// Ayrshare API Integration
export const getPostAnalytics = async (userId: string) => {
  try {
    const response = await fetch('https://app.ayrshare.com/api/analytics/posts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success && data.posts) {
      // Cache the data locally
      await AsyncStorage.setItem(`analytics_${userId}`, JSON.stringify(data.posts));
      return { success: true, data: data.posts };
    }
    
    throw new Error('Failed to fetch analytics');
  } catch (error) {
    console.error('Ayrshare API Error:', error);
    
    // Try to get cached data
    try {
      const cachedData = await AsyncStorage.getItem(`analytics_${userId}`);
      if (cachedData) {
        return { success: true, data: JSON.parse(cachedData), cached: true };
      }
    } catch (cacheError) {
      console.error('Cache error:', cacheError);
    }
    
    return { success: false, data: getMockAnalyticsData() };
  }
};

export const getPlatformMetrics = async (platform: 'twitter' | 'linkedin', userId: string) => {
  try {
    const response = await fetch(`https://app.ayrshare.com/api/analytics/platforms/${platform}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      // Cache platform-specific data
      await AsyncStorage.setItem(`${platform}_metrics_${userId}`, JSON.stringify(data));
      return { success: true, data: data };
    }
    
    throw new Error(`Failed to fetch ${platform} metrics`);
  } catch (error) {
    console.error(`${platform} metrics error:`, error);
    
    // Try cached data
    try {
      const cachedData = await AsyncStorage.getItem(`${platform}_metrics_${userId}`);
      if (cachedData) {
        return { success: true, data: JSON.parse(cachedData), cached: true };
      }
    } catch (cacheError) {
      console.error('Cache error:', cacheError);
    }
    
    return { success: false, data: getMockPlatformData(platform) };
  }
};

// Gemini AI Integration for Trending Topics
export const getTrendingTopics = async (industry?: string) => {
  try {
    const prompt = `Generate 10 trending topics for social media content in ${industry || 'general business'} for ${new Date().getFullYear()}. 
    For each topic, provide:
    - Topic name
    - Estimated search volume/interest level (1-100)
    - Category
    - A brief content suggestion
    - 3-5 relevant hashtags
    
    Format as JSON array with objects containing: topic, volume, category, suggested_content, hashtags.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      const content = data.candidates[0].content.parts[0].text;
      // Try to parse JSON from the response
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const trends = JSON.parse(jsonMatch[0]);
          // Cache trending topics
          await AsyncStorage.setItem('trending_topics', JSON.stringify(trends));
          return { success: true, data: trends };
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }
    
    throw new Error('No trends generated');
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Try cached data
    try {
      const cachedData = await AsyncStorage.getItem('trending_topics');
      if (cachedData) {
        return { success: true, data: JSON.parse(cachedData), cached: true };
      }
    } catch (cacheError) {
      console.error('Cache error:', cacheError);
    }
    
    return { success: false, data: getMockTrendingTopics() };
  }
};

export const generateContentIdeas = async (topic: string, platform: 'twitter' | 'linkedin') => {
  try {
    const platformSpecs = platform === 'twitter' 
      ? 'Twitter (280 characters, engaging, hashtag-friendly)'
      : 'LinkedIn (professional, thought leadership, longer form)';

    const prompt = `Generate 5 ${platform} post ideas about "${topic}" optimized for ${platformSpecs}.
    For each idea, provide:
    - Post content/copy
    - Optimal posting time
    - Relevant hashtags
    - Expected engagement prediction
    
    Format as JSON array.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      return {
        success: true,
        content: data.candidates[0].content.parts[0].text
      };
    }
    
    throw new Error('No content generated');
  } catch (error) {
    console.error('Content generation error:', error);
    return {
      success: false,
      content: getMockContentIdeas(topic, platform)
    };
  }
};

// Mock data for development/fallback
const getMockAnalyticsData = () => [
  {
    id: '1',
    platform: 'twitter',
    content: 'Just launched our new analytics dashboard! 🚀 #analytics #socialmedia',
    post_url: 'https://twitter.com/user/status/1234567890',
    published_at: '2024-01-15T10:00:00Z',
    metrics: { likes: 45, shares: 12, comments: 8, impressions: 1250, engagement_rate: 5.2 }
  },
  {
    id: '2',
    platform: 'linkedin',
    content: 'Insights on the future of social media marketing...',
    post_url: 'https://linkedin.com/posts/user-post-123',
    published_at: '2024-01-14T14:30:00Z',
    metrics: { likes: 78, shares: 25, comments: 15, impressions: 2100, engagement_rate: 5.6 }
  }
];

const getMockPlatformData = (platform: string) => ({
  platform,
  totalPosts: platform === 'twitter' ? 45 : 23,
  totalEngagement: platform === 'twitter' ? 1250 : 890,
  averageEngagementRate: platform === 'twitter' ? 4.8 : 6.2,
  followersGrowth: platform === 'twitter' ? 12 : 8
});

const getMockTrendingTopics = (): TrendingTopic[] => [
  {
    topic: 'AI in Business 2024',
    volume: 89,
    category: 'Technology',
    suggested_content: 'Share insights on how AI is transforming business operations and customer experiences.',
    hashtags: ['#AI', '#Business2024', '#Innovation', '#Technology', '#DigitalTransformation']
  },
  {
    topic: 'Remote Work Best Practices',
    volume: 76,
    category: 'Workplace',
    suggested_content: 'Tips for maintaining productivity and team culture in remote work environments.',
    hashtags: ['#RemoteWork', '#Productivity', '#WorkFromHome', '#TeamCulture', '#WorkLifeBalance']
  },
  {
    topic: 'Sustainable Business Practices',
    volume: 68,
    category: 'Sustainability',
    suggested_content: 'How companies are implementing eco-friendly practices and their impact on success.',
    hashtags: ['#Sustainability', '#GreenBusiness', '#ESG', '#ClimateAction', '#CorporateResponsibility']
  }
];

const getMockContentIdeas = (topic: string, platform: string) => {
  return `Here are 5 ${platform} content ideas for "${topic}":

1. **Question Post**: "What's your experience with ${topic}? Share your insights! 🤔"
   - Best time: 9 AM on weekdays
   - Hashtags: #${topic.replace(/\s+/g, '')} #Discussion #Community
   - Expected engagement: High

2. **Tip/Advice**: "Pro tip: The key to mastering ${topic} is..."
   - Best time: 12 PM lunch break
   - Hashtags: #Tips #${topic.replace(/\s+/g, '')} #ProTip
   - Expected engagement: Medium-High

3. **Behind the Scenes**: "Here's how we approach ${topic} at our company..."
   - Best time: 2 PM on Tuesday/Wednesday
   - Hashtags: #BehindTheScenes #${topic.replace(/\s+/g, '')} #WorkCulture
   - Expected engagement: Medium

4. **Trend Analysis**: "The future of ${topic}: What to expect in 2024..."
   - Best time: 8 AM on Monday
   - Hashtags: #Trends2024 #${topic.replace(/\s+/g, '')} #FutureTech
   - Expected engagement: High

5. **User Generated Content**: "Tag someone who's great at ${topic}! 👇"
   - Best time: 4 PM on Friday
   - Hashtags: #Community #${topic.replace(/\s+/g, '')} #Networking
   - Expected engagement: Very High`;
};

// Supabase Operations for Caching and User Preferences
export const saveAnalyticsCache = async (userId: string, data: any) => {
  try {
    const { error } = await supabase
      .from('analytics_cache')
      .upsert({
        user_id: userId,
        data: data,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving analytics cache:', error);
    return { success: false };
  }
};

export const getUserAnalyticsCache = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('analytics_cache')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting analytics cache:', error);
    return { success: false, data: null };
  }
};

// Subscription Management
export const checkUserSubscription = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return {
      isSubscribed: !!data,
      subscription: data
    };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { isSubscribed: false };
  }
};
