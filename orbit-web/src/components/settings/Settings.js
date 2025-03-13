import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { 
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    email: user?.email || '',
    profilePicture: null,
    emailNotifications: user?.settings?.emailNotifications ?? true,
    pushNotifications: user?.settings?.pushNotifications ?? true,
    language: user?.settings?.language || 'en',
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'privacy', name: 'Privacy & Security', icon: ShieldCheckIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
    { id: 'language', name: 'Language', icon: GlobeAltIcon },
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let profilePictureUrl = user?.profilePicture;

      if (formData.profilePicture) {
        const imageRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}_${formData.profilePicture.name}`);
        const snapshot = await uploadBytes(imageRef, formData.profilePicture);
        profilePictureUrl = await getDownloadURL(snapshot.ref);
      }

      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        username: formData.username,
        bio: formData.bio,
        profilePicture: profilePictureUrl,
        settings: {
          emailNotifications: formData.emailNotifications,
          pushNotifications: formData.pushNotifications,
          language: formData.language,
        },
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      setUser(prev => ({ ...prev, ...updateData }));
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center px-4 sm:px-6 py-4 text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {message.text && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'profile' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Profile Picture
                  </label>
                  <div className="mt-2 flex items-center space-x-4">
                    <img
                      src={
                        formData.profilePicture
                          ? URL.createObjectURL(formData.profilePicture)
                          : user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.username)}&background=random`
                      }
                      alt={formData.username}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                    <input
                      type="file"
                      name="profilePicture"
                      accept="image/*"
                      onChange={handleInputChange}
                      className="text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary file:text-white
                        hover:file:bg-primary-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Notifications
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive email notifications about new messages and mentions
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={formData.emailNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Push Notifications
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="pushNotifications"
                        checked={formData.pushNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dark Mode
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Toggle between light and dark theme
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={toggleDarkMode}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'language' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Privacy Settings
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage who can see your profile and posts
                  </p>
                </div>
                {/* Add privacy settings here */}
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 