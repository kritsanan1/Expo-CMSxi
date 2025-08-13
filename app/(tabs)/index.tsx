
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getPostAnalytics, getPlatformMetrics } from '@/lib/api';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface DashboardMetrics {
  totalPosts: number;
  totalEngagement: number;
  averageEngagementRate: number;
  twitterMetrics: {
    posts: number;
    engagement: number;
    engagementRate: number;
  };
  linkedinMetrics: {
    posts: number;
    engagement: number;
    engagementRate: number;
  };
  topPerformingPosts: Array<{
    platform: string;
    content: string;
    engagement: number;
  }>;
}

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPosts: 0,
    totalEngagement: 0,
    averageEngagementRate: 0,
    twitterMetrics: { posts: 0, engagement: 0, engagementRate: 0 },
    linkedinMetrics: { posts: 0, engagement: 0, engagementRate: 0 },
    topPerformingPosts: []
  });
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'cached'>('live');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;
    
    try {
      // Load post analytics
      const analyticsResult = await getPostAnalytics(user.id);
      if (analyticsResult.success) {
        setDataSource(analyticsResult.cached ? 'cached' : 'live');
      }

      // Load platform metrics
      const [twitterResult, linkedinResult] = await Promise.all([
        getPlatformMetrics('twitter', user.id),
        getPlatformMetrics('linkedin', user.id)
      ]);

      // Process and combine data
      const processedMetrics = processAnalyticsData(
        analyticsResult.data || [],
        twitterResult.data,
        linkedinResult.data
      );
      
      setMetrics(processedMetrics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const processAnalyticsData = (posts: any[], twitterData: any, linkedinData: any): DashboardMetrics => {
    const totalPosts = posts.length;
    const totalEngagement = posts.reduce((sum, post) => 
      sum + (post.metrics?.likes || 0) + (post.metrics?.shares || 0) + (post.metrics?.comments || 0), 0
    );
    
    const averageEngagementRate = posts.length > 0 
      ? posts.reduce((sum, post) => sum + (post.metrics?.engagement_rate || 0), 0) / posts.length 
      : 0;

    const twitterPosts = posts.filter(post => post.platform === 'twitter');
    const linkedinPosts = posts.filter(post => post.platform === 'linkedin');

    const twitterMetrics = {
      posts: twitterPosts.length,
      engagement: twitterPosts.reduce((sum, post) => 
        sum + (post.metrics?.likes || 0) + (post.metrics?.shares || 0) + (post.metrics?.comments || 0), 0
      ),
      engagementRate: twitterData?.averageEngagementRate || 0
    };

    const linkedinMetrics = {
      posts: linkedinPosts.length,
      engagement: linkedinPosts.reduce((sum, post) => 
        sum + (post.metrics?.likes || 0) + (post.metrics?.shares || 0) + (post.metrics?.comments || 0), 0
      ),
      engagementRate: linkedinData?.averageEngagementRate || 0
    };

    // Get top performing posts
    const topPerformingPosts = posts
      .sort((a, b) => (b.metrics?.engagement_rate || 0) - (a.metrics?.engagement_rate || 0))
      .slice(0, 3)
      .map(post => ({
        platform: post.platform,
        content: post.content.substring(0, 100) + '...',
        engagement: (post.metrics?.likes || 0) + (post.metrics?.shares || 0) + (post.metrics?.comments || 0)
      }));

    return {
      totalPosts,
      totalEngagement,
      averageEngagementRate,
      twitterMetrics,
      linkedinMetrics,
      topPerformingPosts
    };
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadAnalytics();
    setTimeout(() => setRefreshing(false), 1500);
  }, [user]);

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
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
        colors={['#1E40AF', '#3B82F6']}
        style={styles.header}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Social Manager'}</Text>
            </View>
            <View style={styles.dataSourceBadge}>
              <Text style={styles.dataSourceText}>
                {dataSource === 'live' ? '🔴 Live' : '📱 Cached'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Your social media performance overview</Text>
        </Animatable.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Key Metrics Cards */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{metrics.totalPosts}</Text>
            <Text style={styles.metricLabel}>Total Posts</Text>
            <Text style={styles.metricIcon}>📝</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{formatNumber(metrics.totalEngagement)}</Text>
            <Text style={styles.metricLabel}>Total Engagement</Text>
            <Text style={styles.metricIcon}>💬</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{metrics.averageEngagementRate.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Avg. Rate</Text>
            <Text style={styles.metricIcon}>📊</Text>
          </View>
        </Animatable.View>

        {/* Platform Breakdown */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.platformCard}>
          <Text style={styles.cardTitle}>Platform Performance</Text>
          
          <View style={styles.platformRow}>
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>🐦 Twitter</Text>
              <Text style={styles.platformStats}>
                {metrics.twitterMetrics.posts} posts • {formatNumber(metrics.twitterMetrics.engagement)} engagement
              </Text>
            </View>
            <View style={styles.engagementBadge}>
              <Text style={styles.engagementText}>{metrics.twitterMetrics.engagementRate.toFixed(1)}%</Text>
            </View>
          </View>

          <View style={styles.platformRow}>
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>💼 LinkedIn</Text>
              <Text style={styles.platformStats}>
                {metrics.linkedinMetrics.posts} posts • {formatNumber(metrics.linkedinMetrics.engagement)} engagement
              </Text>
            </View>
            <View style={styles.engagementBadge}>
              <Text style={styles.engagementText}>{metrics.linkedinMetrics.engagementRate.toFixed(1)}%</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Quick Actions */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/create')}
            >
              <Text style={styles.actionButtonText}>🔥 Trending Topics</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/analytics')}
            >
              <Text style={styles.actionButtonText}>📈 Detailed Analytics</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Top Performing Posts */}
        <Animatable.View animation="fadeInUp" delay={800} style={styles.topPostsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Top Performing Posts</Text>
            {!isSubscribed && (
              <TouchableOpacity style={styles.premiumBadge}>
                <Text style={styles.premiumText}>PRO</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {!isSubscribed ? (
            <View style={styles.premiumPrompt}>
              <Text style={styles.premiumTitle}>Premium Analytics</Text>
              <Text style={styles.premiumDescription}>
                Unlock detailed post performance insights and advanced analytics
              </Text>
              <TouchableOpacity style={styles.upgradeButton}>
                <Text style={styles.upgradeText}>Upgrade to Pro</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {metrics.topPerformingPosts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No posts yet</Text>
                  <Text style={styles.emptyDescription}>
                    Connect your social media accounts to see your top performing content
                  </Text>
                </View>
              ) : (
                metrics.topPerformingPosts.map((post, index) => (
                  <Animatable.View
                    key={index}
                    animation="fadeInUp"
                    delay={1000 + index * 100}
                    style={styles.postItem}
                  >
                    <Text style={styles.postPlatform}>
                      {post.platform === 'twitter' ? '🐦 Twitter' : '💼 LinkedIn'}
                    </Text>
                    <Text style={styles.postContent} numberOfLines={2}>
                      {post.content}
                    </Text>
                    <View style={styles.postStats}>
                      <Text style={styles.postEngagement}>
                        {formatNumber(post.engagement)} engagement
                      </Text>
                    </View>
                  </Animatable.View>
                ))
              )}
            </>
          )}
        </Animatable.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  dataSourceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dataSourceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 16,
  },
  platformCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  platformStats: {
    fontSize: 14,
    color: '#64748B',
  },
  engagementBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  engagementText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  topPostsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  premiumPrompt: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  premiumDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  postItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  postPlatform: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 8,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postEngagement: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
});
