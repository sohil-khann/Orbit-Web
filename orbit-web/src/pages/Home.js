import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { db } from '../firebase/config';
import Post from '../components/post/Post';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (lastDoc = null) => {
    try {
      let postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      if (lastDoc) {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(10)
        );
      }

      const snapshot = await getDocs(postsQuery);
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (lastDoc) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 10);
    } catch (error) {
      setError('Failed to load posts');
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const loadMore = () => {
    if (!hasMore || loading) return;
    fetchPosts(lastVisible);
  };

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => fetchPosts()}
          className="mt-4 text-primary hover:text-primary-dark"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Your Feed
      </h1>

      <div className="space-y-6">
        {posts.map(post => (
          <Post key={post.id} post={post} />
        ))}

        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!loading && hasMore && (
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Load More
            </button>
          </div>
        )}

        {!loading && !hasMore && posts.length > 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No more posts to load
          </p>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
          </div>
        )}
      </div>
    </div>
  );
} 