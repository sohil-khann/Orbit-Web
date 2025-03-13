import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import Post from '../components/post/Post';
import { PencilIcon } from '@heroicons/react/24/outline';

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [newProfilePicture, setNewProfilePicture] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(userData);
        setBio(userData.bio || '');
        setIsFollowing(userData.followers?.includes(currentUser.uid));
      } else {
        setError('User not found');
      }
    } catch (error) {
      setError('Failed to load profile');
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('author.uid', '==', userId),
        where('createdAt', '<=', new Date().toISOString())
      );
      const snapshot = await getDocs(postsQuery);
      const userPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(userPosts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      let profilePictureUrl = profile.profilePicture;

      if (newProfilePicture) {
        const imageRef = ref(storage, `profiles/${userId}_${Date.now()}`);
        const snapshot = await uploadBytes(imageRef, newProfilePicture);
        profilePictureUrl = await getDownloadURL(snapshot.ref);
      }

      await updateDoc(doc(db, 'users', userId), {
        bio,
        profilePicture: profilePictureUrl
      });

      setProfile(prev => ({
        ...prev,
        bio,
        profilePicture: profilePictureUrl
      }));
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const userRef = doc(db, 'users', userId);
      const currentUserRef = doc(db, 'users', currentUser.uid);

      if (isFollowing) {
        await updateDoc(userRef, {
          followers: arrayRemove(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
      } else {
        await updateDoc(userRef, {
          followers: arrayUnion(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
      }

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <img
              src={profile.profilePicture || `https://ui-avatars.com/api/?name=${profile.username}`}
              alt={profile.username}
              className="h-20 w-20 rounded-full object-cover"
            />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.username}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {currentUser.uid === userId ? (
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Profile
            </button>
          ) : (
            <button
              onClick={handleFollow}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isFollowing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-primary text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Tell us about yourself"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewProfilePicture(e.target.files[0])}
                className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-white
                hover:file:cursor-pointer hover:file:bg-primary-dark"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleProfileUpdate}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-700 dark:text-gray-300">{profile.bio || 'No bio yet'}</p>
            <div className="flex space-x-6 mt-4">
              <div>
                <span className="text-gray-900 dark:text-white font-medium">
                  {profile.followers?.length || 0}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Followers</span>
              </div>
              <div>
                <span className="text-gray-900 dark:text-white font-medium">
                  {profile.following?.length || 0}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Following</span>
              </div>
              <div>
                <span className="text-gray-900 dark:text-white font-medium">{posts.length}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Posts</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Posts</h2>
        {posts.map(post => (
          <Post key={post.id} post={post} />
        ))}
        {posts.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            No posts yet
          </p>
        )}
      </div>
    </div>
  );
} 