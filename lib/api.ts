
import { supabase } from './supabase';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Blog Post Types
export interface BlogPost {
  id: string;
  title: string;
  content: string;
  markdown_content: string;
  excerpt: string;
  author_id: string;
  published: boolean;
  published_at?: string;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface BlogDraft {
  id: string;
  title: string;
  content: string;
  markdown_content: string;
  author_id?: string;
  created_at: string;
  updated_at: string;
}

// Gemini AI Integration for Blog Content
export const generateBlogContent = async (topic: string, type: 'idea' | 'outline' | 'content' = 'content') => {
  try {
    let prompt = '';
    
    switch (type) {
      case 'idea':
        prompt = `Generate 5 creative blog post ideas related to "${topic}". Format as a simple list with engaging titles.`;
        break;
      case 'outline':
        prompt = `Create a detailed blog post outline for the topic "${topic}". Include:
        - Compelling headline
        - Introduction hook
        - 3-5 main sections with subsections
        - Conclusion with call-to-action`;
        break;
      case 'content':
        prompt = `Write a comprehensive blog post about "${topic}". Include:
        - Engaging title
        - Compelling introduction
        - Well-structured body with headers
        - Practical examples or tips
        - Strong conclusion
        Format in markdown with proper headers and formatting.`;
        break;
    }

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
    console.error('Gemini API Error:', error);
    return {
      success: false,
      content: getMockBlogContent(topic, type)
    };
  }
};

const getMockBlogContent = (topic: string, type: string) => {
  const mockContent = {
    idea: `# Blog Ideas for "${topic}"

1. The Ultimate Guide to ${topic}: Everything You Need to Know
2. 10 Common Mistakes People Make with ${topic}
3. How ${topic} Changed My Life: A Personal Journey
4. The Future of ${topic}: Trends to Watch in 2025
5. ${topic} for Beginners: A Step-by-Step Approach`,
    
    outline: `# ${topic}: A Comprehensive Guide

## Introduction
- Hook: Interesting statistic or question about ${topic}
- Why this matters to readers
- What they'll learn from this post

## Main Sections
### 1. Understanding ${topic}
- Definition and key concepts
- Why it's important

### 2. Getting Started with ${topic}
- Essential steps
- Common pitfalls to avoid

### 3. Advanced Strategies
- Pro tips and techniques
- Real-world examples

### 4. Tools and Resources
- Recommended tools
- Further reading

## Conclusion
- Recap of key points
- Call-to-action for readers`,

    content: `# Mastering ${topic}: Your Complete Guide

## Introduction

In today's fast-paced world, understanding ${topic} has become more important than ever. Whether you're just starting out or looking to refine your approach, this comprehensive guide will provide you with the insights and strategies you need.

## What is ${topic}?

${topic} is a multifaceted concept that impacts many aspects of our daily lives. At its core, it represents the intersection of innovation, strategy, and practical application.

## Key Benefits

- **Improved Efficiency**: Streamline your processes
- **Better Results**: Achieve your goals more effectively
- **Future-Proofing**: Stay ahead of the curve

## Getting Started

### Step 1: Foundation Building
Start with understanding the fundamentals. This creates a solid base for everything that follows.

### Step 2: Practical Application
Begin implementing what you've learned in small, manageable steps.

### Step 3: Continuous Improvement
Regularly assess and refine your approach based on results and feedback.

## Best Practices

1. **Stay Consistent**: Regular practice leads to mastery
2. **Seek Feedback**: Learn from others' experiences
3. **Adapt and Evolve**: Be flexible in your approach

## Conclusion

Mastering ${topic} is a journey, not a destination. By following the strategies outlined in this guide, you'll be well on your way to achieving your goals. Remember, success comes to those who are willing to put in the effort and stay committed to continuous learning.

*What's your experience with ${topic}? Share your thoughts in the comments below!*`
  };
  
  return mockContent[type as keyof typeof mockContent] || mockContent.content;
};

// Supabase Blog Post Operations
export const createBlogPost = async (post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'views' | 'likes'>) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([{
        ...post,
        views: 0,
        likes: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating blog post:', error);
    return { success: false, error: error.message };
  }
};

export const updateBlogPost = async (id: string, updates: Partial<BlogPost>) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating blog post:', error);
    return { success: false, error: error.message };
  }
};

export const getUserBlogPosts = async (userId: string, published?: boolean) => {
  try {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (published !== undefined) {
      query = query.eq('published', published);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return { success: false, error: error.message };
  }
};

export const incrementPostViews = async (postId: string) => {
  try {
    const { error } = await supabase.rpc('increment_post_views', { post_id: postId });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error incrementing views:', error);
    return { success: false };
  }
};

export const togglePostLike = async (postId: string, userId: string) => {
  try {
    // Check if user already liked the post
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      await supabase.from('post_likes').delete().eq('id', existingLike.id);
      await supabase.rpc('decrement_post_likes', { post_id: postId });
    } else {
      // Like
      await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
      await supabase.rpc('increment_post_likes', { post_id: postId });
    }

    return { success: true, liked: !existingLike };
  } catch (error) {
    console.error('Error toggling like:', error);
    return { success: false };
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

export const getUserPostCount = async (userId: string) => {
  try {
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const { count, error } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error getting post count:', error);
    return { success: false, count: 0 };
  }
};
