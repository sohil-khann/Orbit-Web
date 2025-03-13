import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function Home() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        const q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRecentPosts(posts);
      } catch (error) {
        console.error('Error fetching recent posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPosts();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Orbit
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Connect, share, and explore with the Orbit community
          </p>
        </div>

        {/* Featured Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Posts
            </h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentPosts.map(post => (
                  <div key={post.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                    <h3 className="text-gray-900 dark:text-white font-medium">{post.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      {post.content?.substring(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-4">
              <button className="w-full bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors">
                Create New Post
              </button>
              <button className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                Find Friends
              </button>
              <button className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                Explore Tags
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Getting Started
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-light text-primary">
                    1
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-gray-900 dark:text-white font-medium">Complete your profile</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Add a photo and bio to help others find you</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-light text-primary">
                    2
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-gray-900 dark:text-white font-medium">Follow your interests</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Find and follow topics you care about</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-light text-primary">
                    3
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-gray-900 dark:text-white font-medium">Join the conversation</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Share your thoughts and connect with others</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Community Stats */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Active Users</dt>
              <dd className="mt-2 text-3xl font-semibold text-primary">1,000+</dd>
            </div>
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Daily Posts</dt>
              <dd className="mt-2 text-3xl font-semibold text-primary">500+</dd>
            </div>
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Topics</dt>
              <dd className="mt-2 text-3xl font-semibold text-primary">100+</dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 