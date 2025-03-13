import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Home from './components/Home';
import Profile from './components/profile/Profile';
import Settings from './components/settings/Settings';
import CreatePost from './components/post/CreatePost';
import PostDetail from './components/post/PostDetail';
import Search from './components/search/Search';
import Messages from './components/messages/Messages';
import Notifications from './components/notifications/Notifications';
import NotFound from './components/NotFound';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  theme: {
                    primary: '#68D391',
                  }
                },
                error: {
                  duration: 4000,
                  theme: {
                    primary: '#F56565',
                  }
                }
              }}
            />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/" element={<Home />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/post/:postId" element={<PostDetail />} />
                <Route path="/search" element={<Search />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
