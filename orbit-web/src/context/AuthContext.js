import { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth,
  db
} from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Clear any auth errors when component unmounts or when auth state changes
  useEffect(() => {
    return () => setAuthError(null);
  }, []);

  async function signup(email, password, username) {
    try {
      setAuthError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore with default settings
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username,
        email,
        createdAt: new Date().toISOString(),
        followers: [],
        following: [],
        bio: '',
        profilePicture: '',
        settings: {
          emailNotifications: true,
          pushNotifications: true,
          language: 'en'
        }
      });
      
      return userCredential;
    } catch (error) {
      console.error('Signup error:', error);
      setAuthError(error.message);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      setAuthError(null);
      console.log('Starting login attempt...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
      return result;
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to sign in. Please try again later.';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setAuthError(errorMessage);
      throw error;
    }
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    provider.setCustomParameters({
      prompt: 'select_account',  // Changed from 'consent' to 'select_account'
      access_type: 'offline'
    });
    
    try {
      setAuthError(null);
      console.log('Starting Google sign in...');
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign in successful:', result);
      
      try {
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        
        if (!userDoc.exists()) {
          console.log('Creating new user profile...');
          try {
            // Create user profile if it doesn't exist
            await setDoc(doc(db, 'users', result.user.uid), {
              username: result.user.displayName || result.user.email.split('@')[0],
              email: result.user.email,
              createdAt: new Date().toISOString(),
              followers: [],
              following: [],
              bio: '',
              profilePicture: result.user.photoURL || ''
            });
            console.log('User profile created successfully');
          } catch (firestoreError) {
            console.error('Error creating user profile:', firestoreError);
            // Even if profile creation fails, we still want to log the user in
            setUser(result.user);
          }
        } else {
          console.log('Existing user profile found');
          setUser({ ...result.user, ...userDoc.data() });
        }
      } catch (firestoreError) {
        console.error('Error checking/creating user profile:', firestoreError);
        // If Firestore operations fail, still allow login with basic user info
        setUser(result.user);
      }
      
      return result;
    } catch (error) {
      console.error('Google sign in error:', error);
      let errorMessage = 'Failed to sign in with Google. Please try again later.';
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this website and try again.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign in window was closed. Please try again and complete the sign in process.';
      } else if (error.code === 'auth/user-cancelled') {
        errorMessage = 'Sign in was cancelled. Please grant the required permissions to continue.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Another sign in attempt is in progress. Please wait.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google sign-in. Please contact support.';
      }
      
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async function logout() {
    try {
      setAuthError(null);
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError(error.message);
      throw error;
    }
  }

  // Handle auth state changes
  useEffect(() => {
    console.log('Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              setUser({ ...user, ...userDoc.data() });
            } else {
              console.warn('User document not found in Firestore');
              setUser(user);
            }
          } catch (firestoreError) {
            console.error('Error fetching user profile:', firestoreError);
            // If we can't get Firestore data, still set the user with auth data
            setUser(user);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        setAuthError('Authentication error. Please try signing in again.');
      } finally {
        setLoading(false);
      }
    });

    // Check for redirect result
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Redirect sign-in successful');
        }
      })
      .catch((error) => {
        console.error('Redirect sign-in error:', error);
      });

    return () => {
      unsubscribe();
      setAuthError(null);
    };
  }, []);

  const value = {
    user,
    setUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    loading,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 