import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import {
  ChatBubbleLeftIcon,
  HeartIcon,
  ShareIcon,
  CalendarIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    let unsubscribePost;
    let unsubscribeComments;

    const setupSubscriptions = async () => {
      try {
        // Subscribe to post updates
        unsubscribePost = onSnapshot(doc(db, 'posts', id), (doc) => {
          if (doc.exists()) {
            const postData = { id: doc.id, ...doc.data() };
            setPost(postData);
            setHasLiked(postData.likedBy?.includes(user?.uid));
          } else {
            setError('Post not found');
          }
          setLoading(false);
        }, (error) => {
          console.error('Error fetching post:', error);
          setError('Error loading post');
          setLoading(false);
          toast.error('Failed to load post');
        });

        // Subscribe to comments updates
        const commentsQuery = query(
          collection(db, 'comments'),
          where('postId', '==', id),
          orderBy('createdAt', 'desc')
        );

        unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
          const commentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setComments(commentsData);
        }, (error) => {
          console.error('Error fetching comments:', error);
          toast.error('Failed to load comments');
        });
      } catch (err) {
        console.error('Error setting up subscriptions:', err);
        setError('Error loading content');
        setLoading(false);
        toast.error('Failed to load content');
      }
    };

    if (id) {
      setupSubscriptions();
    }

    return () => {
      if (unsubscribePost) unsubscribePost();
      if (unsubscribeComments) unsubscribeComments();
    };
  }, [id, user?.uid]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like posts');
      navigate('/login');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    try {
      const postRef = doc(db, 'posts', id);
      const newLikeCount = hasLiked ? (post.likes || 1) - 1 : (post.likes || 0) + 1;
      
      await updateDoc(postRef, {
        likes: newLikeCount,
        likedBy: hasLiked 
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid)
      });

      // No need to update state manually as we're using onSnapshot

      // Create notification for post author if liking
      if (!hasLiked && post.author.uid !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.author.uid,
          type: 'info',
          title: 'New Like',
          message: `${user.username} liked your post "${post.title}"`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      toast.success(hasLiked ? 'Post unliked' : 'Post liked');
    } catch (err) {
      console.error('Error updating like:', err);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to comment');
      navigate('/login');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      const commentData = {
        postId: id,
        content: newComment.trim(),
        author: {
          uid: user.uid,
          username: user.username,
          profilePicture: user.profilePicture
        },
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'comments'), commentData);
      setNewComment('');
      toast.success('Comment posted successfully');

      // Create notification for post author
      if (post.author.uid !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.author.uid,
          type: 'info',
          title: 'New Comment',
          message: `${user.username} commented on your post "${post.title}"`,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: post.title,
        text: `Check out this post on Orbit: ${post.title}`,
        url: window.location.href
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Post shared successfully');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      toast.error('Failed to share post');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {error}
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <article className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Post Header */}
        <div className="p-6">
          <div className="flex items-center">
            <img
              src={post.author.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=random`}
              alt={post.author.username}
              className="h-10 w-10 rounded-full"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {post.author.username}
              </p>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {new Date(post.createdAt.toDate()).toLocaleDateString()}
              </div>
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {post.title}
          </h1>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Post Content */}
          <div className="mt-4 prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300">
              {post.content}
            </p>
          </div>

          {/* Post Media */}
          {post.media && (
            <div className="mt-4">
              <img
                src={post.media}
                alt="Post content"
                className="rounded-lg max-h-96 w-full object-cover"
              />
            </div>
          )}

          {/* Post Actions */}
          <div className="mt-6 flex items-center space-x-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <button 
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center text-gray-500 dark:text-gray-400 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasLiked ? (
                <HeartIconSolid className="h-5 w-5 mr-1 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5 mr-1" />
              )}
              <span>{post.likes || 0}</span>
            </button>
            <button className="flex items-center text-gray-500 dark:text-gray-400 hover:text-primary">
              <ChatBubbleLeftIcon className="h-5 w-5 mr-1" />
              <span>{comments.length}</span>
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center text-gray-500 dark:text-gray-400 hover:text-primary"
            >
              <ShareIcon className="h-5 w-5 mr-1" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Comments
            </h2>

            {/* Comment Form */}
            {user ? (
              <div className="mt-6">
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <img
                      className="h-10 w-10 rounded-full"
                      src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`}
                      alt={user.username}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <form className="relative" onSubmit={handleSubmitComment}>
                      <div className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                        <textarea
                          rows={3}
                          name="comment"
                          id="comment"
                          className="block w-full resize-none border-0 bg-transparent py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-0 sm:text-sm"
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
                        <div className="flex items-center space-x-5"></div>
                        <div className="flex-shrink-0">
                          <button
                            type="submit"
                            disabled={isSubmitting || !newComment.trim()}
                            className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Please{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-primary hover:text-primary-dark"
                  >
                    sign in
                  </button>
                  {' '}to comment
                </p>
              </div>
            )}

            {/* Comments List */}
            <div className="mt-8 space-y-6">
              {comments.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <img
                        className="h-10 w-10 rounded-full"
                        src={comment.author.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.username)}&background=random`}
                        alt={comment.author.username}
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {comment.author.username}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(comment.createdAt.toDate()).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
} 