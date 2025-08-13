
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalPosts: number;
  totalEngagement: number;
  averageEngagement: number;
  bestPerformingPost: {
    content: string;
    engagement: number;
  } | null;
  platformBreakdown: {
    twitter: { posts: number; engagement: number };
    linkedin: { posts: number; engagement: number };
  };
  weeklyData: Array<{
    week: string;
    posts: number;
    engagement: number;
  }>;
}

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalPosts: 0,
    totalEngagement: 0,
    averageEngagement: 0,
    bestPerformingPost: null,
    platformBreakdown: {
      twitter: { posts: 0, engagement: 0 },
      linkedin: { posts: 0, engagement: 0 },
    },
    weeklyData: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      const savedPosts = await AsyncStorage.getItem('posts');
      if (savedPosts) {
        const posts = JSON.parse(savedPosts);
        calculateAnalytics(posts);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const calculateAnalytics = (posts: any[]) => {
    const now = new Date();
    const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    const filteredPosts = posts.filter(post => 
      new Date(post.createdAt) >= cutoffDate
    );

    const totalPosts = filteredPosts.length;
    const totalEngagement = filteredPosts.reduce((sum, post) => {
      if (post.engagement) {
        return sum + post.engagement.likes + post.engagement.shares + post.engagement.comments;
      }
      return sum;
    }, 0);

    const averageEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;

    // Find best performing post
    let bestPerformingPost = null;
    let maxEngagement = 0;
    
    filteredPosts.forEach(post => {
      if (post.engagement) {
        const engagement = post.engagement.likes + post.engagement.shares + post.engagement.comments;
        if (engagement > maxEngagement) {
          maxEngagement = engagement;
          bestPerformingPost = {
            content: post.content,
            engagement,
          };
        }
      }
    });

    // Platform breakdown
    const platformBreakdown = {
      twitter: { posts: 0, engagement: 0 },
      linkedin: { posts: 0, engagement: 0 },
    };

    filteredPosts.forEach(post => {
      if (post.platforms.includes('twitter')) {
        platformBreakdown.twitter.posts++;
        if (post.engagement) {
          platformBreakdown.twitter.engagement += 
            post.engagement.likes + post.engagement.shares + post.engagement.comments;
        }
      }
      if (post.platforms.includes('linkedin')) {
        platformBreakdown.linkedin.posts++;
        if (post.engagement) {
          platformBreakdown.linkedin.engagement += 
            post.engagement.likes + post.engagement.shares + post.engagement.comments;
        }
      }
    });

    // Weekly data (simplified)
    const weeklyData = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - ((i + 1) * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      
      const weekPosts = filteredPosts.filter(post => {
        const postDate = new Date(post.createdAt);
        return postDate >= weekStart && postDate < weekEnd;
      });

      const weekEngagement = weekPosts.reduce((sum, post) => {
        if (post.engagement) {
          return sum + post.engagement.likes + post.engagement.shares + post.engagement.comments;
        }
        return sum;
      }, 0);

      weeklyData.unshift({
        week: `Week ${4 - i}`,
        posts: weekPosts.length,
        engagement: weekEngagement,
      });
    }

    setAnalytics({
      totalPosts,
      totalEngagement,
      averageEngagement,
      bestPerformingPost,
      platformBreakdown,
      weeklyData,
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadAnalytics();
    setTimeout(() => setRefreshing(false), 1000);
  }, [selectedPeriod]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your content performance</Text>
        </Animatable.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Period Selection */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.periodCard}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.periodButtons}>
            {['7d', '30d', '90d'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive
                ]}>
                  {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Key Metrics */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{analytics.totalPosts}</Text>
            <Text style={styles.metricLabel}>Total Posts</Text>
            <View style={styles.metricIcon}>
              <Text style={styles.metricIconText}>📝</Text>
            </View>
          </View>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{formatNumber(analytics.totalEngagement)}</Text>
            <Text style={styles.metricLabel}>Total Engagement</Text>
            <View style={styles.metricIcon}>
              <Text style={styles.metricIconText}>❤️</Text>
            </View>
          </View>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{analytics.averageEngagement}</Text>
            <Text style={styles.metricLabel}>Avg. Engagement</Text>
            <View style={styles.metricIcon}>
              <Text style={styles.metricIconText}>📊</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Platform Performance */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.platformCard}>
          <Text style={styles.sectionTitle}>Platform Performance</Text>
          
          <View style={styles.platformRow}>
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>🐦 Twitter</Text>
              <Text style={styles.platformStats}>
                {analytics.platformBreakdown.twitter.posts} posts • {formatNumber(analytics.platformBreakdown.twitter.engagement)} engagement
              </Text>
            </View>
            <View style={styles.platformEngagement}>
              <Text style={styles.engagementNumber}>
                {analytics.platformBreakdown.twitter.posts > 0 
                  ? Math.round(analytics.platformBreakdown.twitter.engagement / analytics.platformBreakdown.twitter.posts)
                  : 0}
              </Text>
              <Text style={styles.engagementLabel}>avg</Text>
            </View>
          </View>

          <View style={styles.platformRow}>
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>💼 LinkedIn</Text>
              <Text style={styles.platformStats}>
                {analytics.platformBreakdown.linkedin.posts} posts • {formatNumber(analytics.platformBreakdown.linkedin.engagement)} engagement
              </Text>
            </View>
            <View style={styles.platformEngagement}>
              <Text style={styles.engagementNumber}>
                {analytics.platformBreakdown.linkedin.posts > 0 
                  ? Math.round(analytics.platformBreakdown.linkedin.engagement / analytics.platformBreakdown.linkedin.posts)
                  : 0}
              </Text>
              <Text style={styles.engagementLabel}>avg</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Weekly Trend */}
        <Animatable.View animation="fadeInUp" delay={800} style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Weekly Trend</Text>
          <View style={styles.chartContainer}>
            {analytics.weeklyData.map((week, index) => (
              <View key={index} style={styles.chartBar}>
                <View 
                  style={[
                    styles.bar,
                    { 
                      height: Math.max(20, (week.engagement / Math.max(...analytics.weeklyData.map(w => w.engagement))) * 100),
                      backgroundColor: '#3B82F6'
                    }
                  ]}
                />
                <Text style={styles.chartLabel}>{week.week}</Text>
                <Text style={styles.chartValue}>{week.engagement}</Text>
              </View>
            ))}
          </View>
        </Animatable.View>

        {/* Best Performing Post */}
        {analytics.bestPerformingPost && (
          <Animatable.View animation="fadeInUp" delay={1000} style={styles.bestPostCard}>
            <Text style={styles.sectionTitle}>Best Performing Post</Text>
            <View style={styles.bestPostContent}>
              <Text style={styles.bestPostText} numberOfLines={3}>
                {analytics.bestPerformingPost.content}
              </Text>
              <View style={styles.bestPostStats}>
                <View style={styles.bestPostStat}>
                  <Text style={styles.bestPostStatNumber}>
                    {analytics.bestPerformingPost.engagement}
                  </Text>
                  <Text style={styles.bestPostStatLabel}>Total Engagement</Text>
                </View>
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Tips */}
        <Animatable.View animation="fadeInUp" delay={1200} style={styles.tipsCard}>
          <Text style={styles.sectionTitle}>💡 Insights</Text>
          <View style={styles.tip}>
            <Text style={styles.tipText}>
              Your average engagement is {analytics.averageEngagement} per post. 
              {analytics.averageEngagement > 20 
                ? ' Great job! Your content is performing well.'
                : ' Try using more engaging visuals and asking questions to boost interaction.'
              }
            </Text>
          </View>
          
          <View style={styles.tip}>
            <Text style={styles.tipText}>
              {analytics.platformBreakdown.twitter.engagement > analytics.platformBreakdown.linkedin.engagement
                ? 'Twitter is your strongest platform. Consider posting more frequently there.'
                : 'LinkedIn is performing better for you. Focus on professional content.'
              }
            </Text>
          </View>
        </Animatable.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  periodCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    backgroundColor: '#EBF8FF',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconText: {
    fontSize: 16,
  },
  platformCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  platformStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  platformEngagement: {
    alignItems: 'center',
  },
  engagementNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  engagementLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  trendCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 16,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  bestPostCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bestPostContent: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  bestPostText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  bestPostStats: {
    flexDirection: 'row',
  },
  bestPostStat: {
    alignItems: 'center',
  },
  bestPostStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  bestPostStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tip: {
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});
