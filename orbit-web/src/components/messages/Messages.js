import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Fetch user's conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversationsData = [];
      snapshot.forEach((doc) => {
        conversationsData.push({ id: doc.id, ...doc.data() });
      });
      setConversations(conversationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', selectedConversation.id),
      orderBy('createdAt')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search users
  useEffect(() => {
    if (!searchQuery) {
      setFilteredUsers([]);
      return;
    }

    const searchUsers = async () => {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchQuery),
        where('username', '<=', searchQuery + '\uf8ff')
      );

      const snapshot = await getDocs(q);
      const users = [];
      snapshot.forEach((doc) => {
        if (doc.id !== user.uid) {
          users.push({ id: doc.id, ...doc.data() });
        }
      });
      setFilteredUsers(users);
    };

    searchUsers();
  }, [searchQuery, user]);

  const startNewConversation = async (otherUser) => {
    // Check if conversation already exists
    const existingConversation = conversations.find(
      conv => conv.participants.includes(otherUser.id)
    );

    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setSearchQuery('');
      setFilteredUsers([]);
      return;
    }

    // Create new conversation
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      participants: [user.uid, otherUser.id],
      participantDetails: {
        [user.uid]: {
          username: user.username,
          profilePicture: user.profilePicture
        },
        [otherUser.id]: {
          username: otherUser.username,
          profilePicture: otherUser.profilePicture
        }
      },
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    setSelectedConversation({
      id: conversationRef.id,
      participants: [user.uid, otherUser.id],
      participantDetails: {
        [user.uid]: {
          username: user.username,
          profilePicture: user.profilePicture
        },
        [otherUser.id]: {
          username: otherUser.username,
          profilePicture: otherUser.profilePicture
        }
      }
    });
    setSearchQuery('');
    setFilteredUsers([]);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await addDoc(collection(db, 'messages'), {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });

      // Update conversation's lastMessageAt
      await addDoc(collection(db, 'conversations', selectedConversation.id), {
        lastMessageAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getOtherParticipant = (conversation) => {
    const otherUserId = conversation.participants.find(id => id !== user.uid);
    return conversation.participantDetails[otherUserId];
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Search Results */}
        {filteredUsers.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <h3 className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Search Results
            </h3>
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => startNewConversation(user)}
                className="w-full p-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <img
                  src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`}
                  alt={user.username}
                  className="h-10 w-10 rounded-full"
                />
                <span className="ml-3 text-gray-900 dark:text-white">
                  {user.username}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Conversations */}
        <div className="overflow-y-auto h-full">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              return (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-gray-50 dark:bg-gray-800'
                      : ''
                  }`}
                >
                  <img
                    src={otherParticipant.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.username)}&background=random`}
                    alt={otherParticipant.username}
                    className="h-12 w-12 rounded-full"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {otherParticipant.username}
                      </h3>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-gray-500">
                          {new Date(conversation.lastMessageAt.toDate()).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
              <img
                src={getOtherParticipant(selectedConversation).profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(getOtherParticipant(selectedConversation).username)}&background=random`}
                alt={getOtherParticipant(selectedConversation).username}
                className="h-10 w-10 rounded-full"
              />
              <h2 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
                {getOtherParticipant(selectedConversation).username}
              </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderId === user.uid ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                      message.senderId === user.uid
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p>{message.text}</p>
                    <span className="text-xs opacity-75">
                      {message.createdAt?.toDate().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              Select a conversation or start a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 