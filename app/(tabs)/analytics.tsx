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
import { useAuth } from '@/contexts/AuthContext';
import { getUserBlogPosts, BlogPost } from '@/lib/api';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalLikes: number;
  averageViews: number;
  bestPerformingPost: {
    title: string;
    views: number;
    likes: number;
  } | null;
  recentTrend: Array<{
    week: string;
    posts: number;
    views: number;
    likes: number;
  }>;
}

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    averageViews: 0,
    bestPerformingPost: null,
    recentTrend: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [selectedPeriod, user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      const result = await getUserBlogPosts(user.id);
      if (result.success && result.data) {
        calculateAnalytics(result.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const calculateAnalytics = (posts: BlogPost[]) => {
    const now = new Date();
    const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    const filteredPosts = posts.filter(post => 
      new Date(post.created_at) >= cutoffDate
    );

    const totalPosts = filteredPosts.length;
    const publishedPosts = filteredPosts.filter(post => post.published).length;
    const draftPosts = filteredPosts.filter(post => !post.published).length;

    const totalViews = filteredPosts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalLikes = filteredPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const averageViews = publishedPosts > 0 ? Math.round(totalViews / publishedPosts) : 0;

    // Find best performing post
    let bestPerformingPost = null;
    let maxEngagement = 0;

    filteredPosts.forEach(post => {
      const engagement = (post.views || 0) + (post.likes || 0) * 2; // Weight likes higher
      if (engagement > maxEngagement) {
        maxEngagement = engagement;
        bestPerformingPost = {
          title: post.title,
          views: post.views || 0,
          likes: post.likes || 0,
        };
      }
    });

    // Weekly trend data
    const recentTrend = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - ((i + 1) * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));

      const weekPosts = filteredPosts.filter(post => {
        const postDate = new Date(post.created_at);
        return postDate >= weekStart && postDate < weekEnd;
      });

      const weekViews = weekPosts.reduce((sum, post) => sum + (post.views || 0), 0);
      const weekLikes = weekPosts.reduce((sum, post) => sum + (post.likes || 0), 0);

      recentTrend.unshift({
        week: `Week ${4 - i}`,
        posts: weekPosts.filter(post => post.published).length,
        views: weekViews,
        likes: weekLikes,
      });
    }

    setAnalytics({
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews,
      totalLikes,
      averageViews,
      bestPerformingPost,
      recentTrend,
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadAnalytics();
    setTimeout(() => setRefreshing(false), 1000);
  }, [selectedPeriod, user]);

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
        colors={['#1f2937', '#374151']}
        style={styles.header}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <Text style={styles.headerTitle}>Blog Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your writing performance</Text>
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
            <Text style={styles.metricNumber}>{analytics.publishedPosts}</Text>
            <Text style={styles.metricLabel}>Published Posts</Text>
            <View style={styles.metricIcon}>
              <Text style={styles.metricIconText}>📝</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{formatNumber(analytics.totalViews)}</Text>
            <Text style={styles.metricLabel}>Total Views</Text>
            <View style={styles.metricIcon}>
              <Text style={styles.metricIconText}>👁️</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{analytics.totalLikes}</Text>
            <Text style={styles.metricLabel}>Total Likes</Text>
            <View style={styles.metricIcon}>
              <Text style={styles.metricIconText}>❤️</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Secondary Metrics */}
        <Animatable.View animation="fadeInUp" delay={500} style={styles.secondaryMetricsContainer}>
          <View style={styles.secondaryMetricCard}>
            <Text style={styles.secondaryMetricNumber}>{analytics.draftPosts}</Text>
            <Text style={styles.secondaryMetricLabel}>Drafts</Text>
          </View>

          <View style={styles.secondaryMetricCard}>
            <Text style={styles.secondaryMetricNumber}>{analytics.averageViews}</Text>
            <Text style={styles.secondaryMetricLabel}>Avg. Views</Text>
          </View>
        </Animatable.View>

        {/* Weekly Trend */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Weekly Performance</Text>
          <View style={styles.chartContainer}>
            {analytics.recentTrend.map((week, index) => {
              const maxViews = Math.max(...analytics.recentTrend.map(w => w.views));
              const height = maxViews > 0 ? (week.views / maxViews) * 100 : 20;

              return (
                <View key={index} style={styles.chartBar}>
                  <View 
                    style={[
                      styles.bar,
                      { 
                        height: Math.max(20, height),
                        backgroundColor: '#3B82F6'
                      }
                    ]}
                  />
                  <Text style={styles.chartLabel}>{week.week}</Text>
                  <Text style={styles.chartValue}>{week.views}</Text>
                  <Text style={styles.chartSubValue}>👁️</Text>
                </View>
              );
            })}
          </View>
        </Animatable.View>

        {/* Best Performing Post */}
        {analytics.bestPerformingPost && (
          <Animatable.View animation="fadeInUp" delay={800} style={styles.bestPostCard}>
            <Text style={styles.sectionTitle}>Top Performing Post</Text>
            <View style={styles.bestPostContent}>
              <Text style={styles.bestPostTitle} numberOfLines={2}>
                {analytics.bestPerformingPost.title}
              </Text>
              <View style={styles.bestPostStats}>
                <View style={styles.bestPostStat}>
                  <Text style={styles.bestPostStatNumber}>
                    {analytics.bestPerformingPost.views}
                  </Text>
                  <Text style={styles.bestPostStatLabel}>Views</Text>
                </View>
                <View style={styles.bestPostStat}>
                  <Text style={styles.bestPostStatNumber}>
                    {analytics.bestPerformingPost.likes}
                  </Text>
                  <Text style={styles.bestPostStatLabel}>Likes</Text>
                </View>
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Insights & Tips */}
        <Animatable.View animation="fadeInUp" delay={1000} style={styles.insightsCard}>
          <Text style={styles.sectionTitle}>💡 Writing Insights</Text>

          <View style={styles.insight}>
            <Text style={styles.insightText}>
              {analytics.averageViews > 50 
                ? `Great job! Your posts average ${analytics.averageViews} views. Keep writing consistently to grow your audience.`
                : `Your posts average ${analytics.averageViews} views. Try writing about trending topics and using engaging titles to increase views.`
              }
            </Text>
          </View>

          <View style={styles.insight}>
            <Text style={styles.insightText}>
              {analytics.publishedPosts > analytics.draftPosts
                ? 'You\'re great at publishing your work! Keep up the momentum.'
                : `You have ${analytics.draftPosts} drafts waiting. Consider publishing some of them to boost your content output.`
              }
            </Text>
          </View>

          {analytics.totalLikes / Math.max(analytics.publishedPosts, 1) < 2 && (
            <View style={styles.insight}>
              <Text style={styles.insightText}>
                Try ending your posts with questions to encourage reader engagement and likes.
              </Text>
            </View>
          )}
        </Animatable.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
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
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  periodCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
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
    backgroundColor: '#374151',
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
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
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    backgroundColor: '#374151',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconText: {
    fontSize: 16,
  },
  secondaryMetricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  secondaryMetricCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryMetricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  secondaryMetricLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  trendCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
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
    color: '#9CA3AF',
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  chartSubValue: {
    fontSize: 8,
    color: '#6B7280',
  },
  bestPostCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  bestPostContent: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  bestPostTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    lineHeight: 22,
    marginBottom: 12,
  },
  bestPostStats: {
    flexDirection: 'row',
    gap: 24,
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
    color: '#9CA3AF',
  },
  insightsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  insight: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
});