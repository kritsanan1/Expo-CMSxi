
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Post {
  id: string;
  content: string;
  platforms: string[];
  createdAt: string;
  status: 'draft' | 'published' | 'scheduled';
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { postsCount, maxPosts, isSubscribed } = useSubscription();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalEngagement: 0,
    averageEngagement: 0,
  });

  useEffect(() => {
    loadPosts();
    loadStats();
  }, []);

  const loadPosts = async () => {
    try {
      const savedPosts = await AsyncStorage.getItem('posts');
      if (savedPosts) {
        const parsedPosts = JSON.parse(savedPosts);
        setPosts(parsedPosts.slice(0, 5)); // Show latest 5 posts
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadStats = async () => {
    try {
      const savedPosts = await AsyncStorage.getItem('posts');
      if (savedPosts) {
        const parsedPosts = JSON.parse(savedPosts);
        const totalPosts = parsedPosts.length;
        const totalEngagement = parsedPosts.reduce((sum: number, post: Post) => {
          if (post.engagement) {
            return sum + post.engagement.likes + post.engagement.shares + post.engagement.comments;
          }
          return sum;
        }, 0);
        
        setStats({
          totalPosts,
          totalEngagement,
          averageEngagement: totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadPosts();
    loadStats();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Creator'}</Text>
          <Text style={styles.subtitle}>Ready to create amazing content?</Text>
        </Animatable.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Subscription Status */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.subscriptionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Plan</Text>
            {!isSubscribed && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>FREE</Text>
              </View>
            )}
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {postsCount} of {maxPosts} posts used this month
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
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </Animatable.View>

        {/* Stats Cards */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalPosts}</Text>
            <Text style={styles.statLabel}>Total Posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalEngagement}</Text>
            <Text style={styles.statLabel}>Total Engagement</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.averageEngagement}</Text>
            <Text style={styles.statLabel}>Avg. Engagement</Text>
          </View>
        </Animatable.View>

        {/* Quick Actions */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>✏️ New Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
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
                Create your first post to get started!
              </Text>
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
                  <Text style={styles.postText} numberOfLines={2}>
                    {post.content}
                  </Text>
                  <View style={styles.postMeta}>
                    <View style={styles.platformTags}>
                      {post.platforms.map((platform, idx) => (
                        <View key={idx} style={styles.platformTag}>
                          <Text style={styles.platformTagText}>
                            {platform === 'twitter' ? '🐦' : '💼'} {platform}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.postDate}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: post.status === 'published' ? '#10B981' : '#F59E0B' }
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
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  subscriptionCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#EF4444',
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
    color: '#6B7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  quickActionsCard: {
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  recentPostsCard: {
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
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  postItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  postContent: {
    flex: 1,
  },
  postText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformTags: {
    flexDirection: 'row',
    gap: 8,
  },
  platformTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  platformTagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  postDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
    alignSelf: 'center',
  },
});
