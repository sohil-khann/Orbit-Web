import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  startAfter, 
  limit, 
  getDocs,
  or,
  and
} from 'firebase/firestore';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  HashtagIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

export default function Search() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    date: 'all',
    sortBy: 'recent',
    type: 'all'
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const tabs = [
    { id: 'all', name: 'All', icon: MagnifyingGlassIcon },
    { id: 'users', name: 'Users', icon: UserGroupIcon },
    { id: 'posts', name: 'Posts', icon: DocumentTextIcon },
    { id: 'tags', name: 'Tags', icon: HashtagIcon }
  ];

  const performSearch = async (isLoadMore = false) => {
    if (!searchQuery.trim() && activeTab === 'all') return;
    
    setLoading(true);
    try {
      let searchResults = [];
      const batchSize = 10;

      if (activeTab === 'users' || activeTab === 'all') {
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '>=', searchQuery.toLowerCase()),
          where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
          limit(batchSize)
        );

        if (isLoadMore && lastVisible) {
          usersQuery = query(usersQuery, startAfter(lastVisible));
        }

        const usersSnapshot = await getDocs(usersQuery);
        const userData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'user',
          ...doc.data()
        }));
        searchResults = [...searchResults, ...userData];

        if (usersSnapshot.docs.length > 0) {
          setLastVisible(usersSnapshot.docs[usersSnapshot.docs.length - 1]);
          setHasMore(usersSnapshot.docs.length === batchSize);
        }
      }

      if (activeTab === 'posts' || activeTab === 'all') {
        let postsQuery = query(
          collection(db, 'posts'),
          or(
            where('title', '>=', searchQuery.toLowerCase()),
            where('title', '<=', searchQuery.toLowerCase() + '\uf8ff'),
            where('tags', 'array-contains', searchQuery.toLowerCase())
          )
        );

        if (filters.date !== 'all') {
          const dateFilter = new Date();
          dateFilter.setDate(dateFilter.getDate() - (filters.date === 'week' ? 7 : 30));
          postsQuery = query(postsQuery, where('createdAt', '>=', dateFilter));
        }

        postsQuery = query(
          postsQuery,
          orderBy(filters.sortBy === 'recent' ? 'createdAt' : 'likes', 'desc'),
          limit(batchSize)
        );

        if (isLoadMore && lastVisible) {
          postsQuery = query(postsQuery, startAfter(lastVisible));
        }

        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'post',
          ...doc.data()
        }));
        searchResults = [...searchResults, ...postsData];

        if (postsSnapshot.docs.length > 0) {
          setLastVisible(postsSnapshot.docs[postsSnapshot.docs.length - 1]);
          setHasMore(postsSnapshot.docs.length === batchSize);
        }
      }

      if (activeTab === 'tags' || activeTab === 'all') {
        const tagsQuery = query(
          collection(db, 'tags'),
          where('name', '>=', searchQuery.toLowerCase()),
          where('name', '<=', searchQuery.toLowerCase() + '\uf8ff'),
          limit(batchSize)
        );

        if (isLoadMore && lastVisible) {
          tagsQuery = query(tagsQuery, startAfter(lastVisible));
        }

        const tagsSnapshot = await getDocs(tagsQuery);
        const tagsData = tagsSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'tag',
          ...doc.data()
        }));
        searchResults = [...searchResults, ...tagsData];

        if (tagsSnapshot.docs.length > 0) {
          setLastVisible(tagsSnapshot.docs[tagsSnapshot.docs.length - 1]);
          setHasMore(tagsSnapshot.docs.length === batchSize);
        }
      }

      setResults(prevResults => isLoadMore ? [...prevResults, ...searchResults] : searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery || activeTab !== 'all') {
        setLastVisible(null);
        setHasMore(true);
        performSearch();
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, activeTab, filters]);

  const loadMore = () => {
    if (!loading && hasMore) {
      performSearch(true);
    }
  };

  const renderResult = (result) => {
    switch (result.type) {
      case 'user':
        return (
          <div key={result.id} className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
            <img
              src={result.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.username)}&background=random`}
              alt={result.username}
              className="h-10 w-10 rounded-full"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{result.username}</p>
              {result.bio && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{result.bio}</p>
              )}
            </div>
          </div>
        );

      case 'post':
        return (
          <div key={result.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">{result.title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{result.content}</p>
            <div className="mt-2 flex items-center space-x-2">
              {result.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-light text-primary">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        );

      case 'tag':
        return (
          <div key={result.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
            <div className="flex items-center space-x-2">
              <HashtagIcon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {result.name}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {result.count} posts
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for users, posts, or tags..."
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute inset-y-0 right-0 flex items-center pr-3"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date
              </label>
              <select
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All time</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="recent">Most recent</option>
                <option value="likes">Most liked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All types</option>
                <option value="text">Text only</option>
                <option value="media">With media</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Results */}
      <div className="mt-4">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'No results found'
                : 'Start typing to search...'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {results.map(renderResult)}
          </div>
        )}

        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 