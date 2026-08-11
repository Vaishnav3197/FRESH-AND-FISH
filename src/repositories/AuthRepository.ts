import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase/config';
import { UserProfile } from '../types';

export class AuthRepository {
  /**
   * Login with email and password. Matches the Android auto-registration convenience feature.
   */
  static async login(email: string, password: string): Promise<UserProfile> {
    const normalizedEmail = email.trim().toLowerCase();
    
    try {
      // 1. Attempt login
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const user = credential.user;
      
      // Fetch profile
      return await this.fetchOrCreateProfile(user, normalizedEmail);
    } catch (error: any) {
      console.log('Login error code:', error.code);
      
      // Auto-register convenience (similar to Android behavior)
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          console.log(`User not found or credentials invalid. Attempting auto-registration for: ${normalizedEmail}`);
          const regCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          return await this.fetchOrCreateProfile(regCredential.user, normalizedEmail, true);
        } catch (regError: any) {
          // If collision occurs, then the email exists and the password entered during sign-in was incorrect.
          if (regError.code === 'auth/email-already-in-use') {
            throw new Error('Incorrect password or malformed email.');
          }
          throw regError;
        }
      }
      throw error;
    }
  }

  /**
   * Log out the current user.
   */
  static async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Fetch current user profile if logged in.
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return this.fetchOrCreateProfile(user, user.email || '');
  }

  /**
   * Monitor auth state changes.
   */
  static subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await this.fetchOrCreateProfile(firebaseUser, firebaseUser.email || '');
          callback(profile);
        } catch (e) {
          console.error('Error fetching user profile:', e);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  /**
   * Helper to load or initialize user document in Firestore `/users/{uid}`
   */
  private static async fetchOrCreateProfile(
    user: FirebaseUser, 
    email: string, 
    forceCreate: boolean = false
  ): Promise<UserProfile> {
    const userDocRef = doc(db, 'users', user.uid);
    
    if (!forceCreate) {
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
    }

    // Determine role and name (Android logic: employee@fishshop.com is employee, others are owners)
    const isEmployee = email.toLowerCase() === 'employee@fishshop.com';
    const role = isEmployee ? 'employee' : 'owner';
    
    // Capitalize email prefix as name
    const emailPrefix = email.substring(0, email.indexOf('@'));
    const name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

    const newProfile: UserProfile = {
      uid: user.uid,
      email,
      role,
      name
    };

    // Save profile to database
    await setDoc(userDocRef, newProfile);
    console.log(`Created users profile in Firestore for ${email} with role ${role}`);
    
    return newProfile;
  }
}
