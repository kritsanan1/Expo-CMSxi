
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
import { getUserBlogPosts, BlogPost } from '@/lib/api';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const { postsCount, maxPosts, isSubscribed } = useSubscription();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    averageViews: 0,
  });

  useEffect(() => {
    if (user) {
      loadBlogPosts();
    }
  }, [user]);

  const loadBlogPosts = async () => {
    if (!user) return;
    
    try {
      const result = await getUserBlogPosts(user.id);
      if (result.success && result.data) {
        const blogPosts = result.data.slice(0, 5); // Show latest 5 posts
        setPosts(blogPosts);
        calculateStats(result.data);
      }
    } catch (error) {
      console.error('Error loading blog posts:', error);
    }
  };

  const calculateStats = (allPosts: BlogPost[]) => {
    const totalPosts = allPosts.length;
    const totalViews = allPosts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalLikes = allPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const averageViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

    setStats({
      totalPosts,
      totalViews,
      totalLikes,
      averageViews,
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadBlogPosts();
    setTimeout(() => setRefreshing(false), 1000);
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
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
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Writer'}</Text>
          <Text style={styles.subtitle}>Ready to share your thoughts with the world?</Text>
        </Animatable.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Subscription Status */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.subscriptionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Writing Plan</Text>
            {!isSubscribed && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>FREE</Text>
              </View>
            )}
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {postsCount} of {maxPosts} blog posts this month
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(postsCount / maxPosts) * 100}%` }
                ]}
              />
            </View>
          </View>
          {!isSubscribed && postsCount >= maxPosts && (
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </Animatable.View>

        {/* Stats Cards */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalPosts}</Text>
            <Text style={styles.statLabel}>Blog Posts</Text>
            <Text style={styles.statIcon}>📝</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalViews}</Text>
            <Text style={styles.statLabel}>Total Views</Text>
            <Text style={styles.statIcon}>👁️</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalLikes}</Text>
            <Text style={styles.statLabel}>Total Likes</Text>
            <Text style={styles.statIcon}>❤️</Text>
          </View>
        </Animatable.View>

        {/* Quick Actions */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/create')}
            >
              <Text style={styles.actionButtonText}>✏️ New Post</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/analytics')}
            >
              <Text style={styles.actionButtonText}>📊 Analytics</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Recent Posts */}
        <Animatable.View animation="fadeInUp" delay={800} style={styles.recentPostsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Posts</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No posts yet</Text>
              <Text style={styles.emptyStateText}>
                Start writing your first blog post to share your ideas!
              </Text>
              <TouchableOpacity 
                style={styles.createFirstPostButton}
                onPress={() => router.push('/(tabs)/create')}
              >
                <Text style={styles.createFirstPostText}>Create Your First Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            posts.map((post, index) => (
              <Animatable.View
                key={post.id}
                animation="fadeInUp"
                delay={1000 + index * 100}
                style={styles.postItem}
              >
                <View style={styles.postContent}>
                  <Text style={styles.postTitle} numberOfLines={1}>
                    {post.title}
                  </Text>
                  <Text style={styles.postExcerpt} numberOfLines={2}>
                    {post.excerpt || truncateContent(post.content)}
                  </Text>
                  <View style={styles.postMeta}>
                    <Text style={styles.postDate}>
                      {formatDate(post.created_at)}
                    </Text>
                    <View style={styles.postStats}>
                      <Text style={styles.statText}>👁️ {post.views}</Text>
                      <Text style={styles.statText}>❤️ {post.likes}</Text>
                    </View>
                  </View>
                </View>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: post.published ? '#10B981' : '#F59E0B' }
                ]} />
              </Animatable.View>
            ))
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
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  subscriptionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
  },
  badge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  upgradeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 16,
  },
  quickActionsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9fafb',
  },
  recentPostsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  createFirstPostButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstPostText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  postItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  postContent: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  postExcerpt: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    lineHeight: 20,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  postStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
    alignSelf: 'center',
  },
});
