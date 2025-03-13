import { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';
import {
  ChatBubbleLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

export default function Post({ post }) {
  const { user } = useAuth();
  const [isUpvoted, setIsUpvoted] = useState(post.upvotes?.includes(user.uid));
  const [isDownvoted, setIsDownvoted] = useState(post.downvotes?.includes(user.uid));
  const [voteCount, setVoteCount] = useState(
    (post.upvotes?.length || 0) - (post.downvotes?.length || 0)
  );

  const handleVote = async (isUpvote) => {
    const postRef = doc(db, 'posts', post.id);
    const currentVoteStatus = isUpvote ? isUpvoted : isDownvoted;
    const oppositeVoteStatus = isUpvote ? isDownvoted : isUpvoted;

    try {
      if (currentVoteStatus) {
        // Remove vote
        await updateDoc(postRef, {
          [isUpvote ? 'upvotes' : 'downvotes']: arrayRemove(user.uid)
        });
        setVoteCount(isUpvote ? voteCount - 1 : voteCount + 1);
      } else {
        // Add vote and remove opposite vote if exists
        const updates = {
          [isUpvote ? 'upvotes' : 'downvotes']: arrayUnion(user.uid)
        };
        
        if (oppositeVoteStatus) {
          updates[isUpvote ? 'downvotes' : 'upvotes'] = arrayRemove(user.uid);
        }
        
        await updateDoc(postRef, updates);
        setVoteCount(
          isUpvote
            ? voteCount + (oppositeVoteStatus ? 2 : 1)
            : voteCount - (oppositeVoteStatus ? 2 : 1)
        );
      }

      if (isUpvote) {
        setIsUpvoted(!currentVoteStatus);
        setIsDownvoted(false);
      } else {
        setIsDownvoted(!currentVoteStatus);
        setIsUpvoted(false);
      }
    } catch (error) {
      console.error('Error updating vote:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4">
      {/* Post Header */}
      <div className="flex items-center mb-4">
        <img
          className="h-10 w-10 rounded-full"
          src={post.author.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}`}
          alt={post.author.username}
        />
        <div className="ml-3">
          <Link
            to={`/profile/${post.author.uid}`}
            className="text-sm font-medium text-gray-900 dark:text-white hover:underline"
          >
            {post.author.username}
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {moment(post.createdAt).fromNow()}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {post.title}
        </h2>
        <p className="text-gray-700 dark:text-gray-300">{post.content}</p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post content"
            className="mt-4 rounded-lg max-h-96 w-full object-cover"
          />
        )}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between border-t dark:border-gray-700 pt-4">
        <div className="flex items-center space-x-4">
          {/* Voting */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleVote(true)}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isUpvoted ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <ArrowUpIcon className="h-6 w-6" />
            </button>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {voteCount}
            </span>
            <button
              onClick={() => handleVote(false)}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isDownvoted ? 'text-danger' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <ArrowDownIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Comments */}
          <Link
            to={`/post/${post.id}`}
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ChatBubbleLeftIcon className="h-6 w-6 mr-1" />
            <span>{post.commentCount || 0}</span>
          </Link>

          {/* Share */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + `/post/${post.id}`);
            }}
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ShareIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
} 