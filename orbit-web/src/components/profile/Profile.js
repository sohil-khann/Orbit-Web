import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  PencilIcon,
  UserCircleIcon,
  PhotoIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [recentPosts, setRecentPosts] = useState([]);
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
    likes: 0
  });
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    profilePicture: null
  });

  useEffect(() => {
    fetchUserStats();
    fetchRecentPosts();
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Fetch post count
      const postsQuery = query(
        collection(db, 'posts'),
        where('author.uid', '==', user.uid)
      );
      const postsSnapshot = await getDocs(postsQuery);
      
      // Calculate total likes across all posts
      let totalLikes = 0;
      postsSnapshot.forEach(doc => {
        totalLikes += doc.data().likes || 0;
      });

      setStats({
        posts: postsSnapshot.size,
        followers: user.followers?.length || 0,
        following: user.following?.length || 0,
        likes: totalLikes
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchRecentPosts = async () => {
    if (!user) return;

    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('author.uid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const snapshot = await getDocs(postsQuery);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRecentPosts(posts);
    } catch (error) {
      console.error('Error fetching recent posts:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let profilePictureUrl = user.profilePicture;

      if (formData.profilePicture) {
        const imageRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}_${formData.profilePicture.name}`);
        const snapshot = await uploadBytes(imageRef, formData.profilePicture);
        profilePictureUrl = await getDownloadURL(snapshot.ref);
      }

      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        username: formData.username,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        profilePicture: profilePictureUrl,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      
      // Update local user state
      setUser(prev => ({ ...prev, ...updateData }));
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Please sign in to view your profile
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-primary to-primary-dark">
          {isEditing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <label className="cursor-pointer">
                <input
                  type="file"
                  name="coverPhoto"
                  className="hidden"
                  accept="image/*"
                />
                <PhotoIcon className="h-8 w-8 text-white" />
              </label>
            </div>
          )}
        </div>
        
        <div className="relative px-4 py-5 sm:px-6">
          <div className="flex items-center">
            <div className="relative -mt-16">
              <img
                src={formData.profilePicture 
                  ? URL.createObjectURL(formData.profilePicture)
                  : user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`
                }
                alt={user.username}
                className="h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 object-cover"
              />
              {isEditing && (
                <label className="absolute bottom-0 right-0 cursor-pointer">
                  <input
                    type="file"
                    name="profilePicture"
                    className="hidden"
                    accept="image/*"
                    onChange={handleInputChange}
                  />
                  <div className="rounded-full bg-primary p-2 text-white">
                    <PencilIcon className="h-4 w-4" />
                  </div>
                </label>
              )}
            </div>
            
            <div className="ml-6 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-0"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {user.username}
                    </h2>
                  )}
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Location"
                      className="mt-1 text-sm text-gray-500 dark:text-gray-400 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-0"
                    />
                  ) : (
                    user.location && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {user.location}
                      </p>
                    )
                  )}
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
              
              {isEditing ? (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Write a bio..."
                  rows={3}
                  className="mt-4 w-full text-gray-600 dark:text-gray-300 bg-transparent border rounded-md border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-0"
                />
              ) : (
                user.bio && (
                  <p className="mt-4 text-gray-600 dark:text-gray-300">
                    {user.bio}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="text-center">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Posts</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{stats.posts}</dd>
            </div>
            <div className="text-center">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Followers</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{stats.followers}</dd>
            </div>
            <div className="text-center">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Following</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{stats.following}</dd>
            </div>
            <div className="text-center">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Likes</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{stats.likes}</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Posts */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Posts</h3>
            <div className="mt-6 flow-root">
              <ul className="-my-5 divide-y divide-gray-200 dark:divide-gray-700">
                {recentPosts.map(post => (
                  <li key={post.id} className="py-5">
                    <div className="relative focus-within:ring-2 focus-within:ring-primary">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {post.title}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(post.createdAt.toDate()).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                          {post.comments?.length || 0}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <HeartIcon className="h-4 w-4 mr-1" />
                          {post.likes || 0}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Edit Profile
              </h3>
              
              {message.text && (
                <div className={`mb-4 p-4 rounded ${
                  message.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 