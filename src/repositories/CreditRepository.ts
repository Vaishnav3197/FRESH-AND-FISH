import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Credit } from '../types';

export class CreditRepository {
  private static creditsCollection = collection(db, 'credits');

  /**
   * Listen to all credit/payment records in real-time, sorted by purchase date descending.
   */
  static getCredits(
    onUpdate: (credits: Credit[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(this.creditsCollection, orderBy('purchaseDate', 'desc'));
    
    return onSnapshot(
      q,
      (snapshot) => {
        const credits: Credit[] = [];
        snapshot.forEach((doc) => {
          credits.push({
            ...(doc.data() as Credit),
            id: doc.id,
          });
        });
        onUpdate(credits);
      },
      (error) => {
        console.error('Error listening to credits:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Listen to credits in a specific date range, sorted by purchase date descending.
   */
  static getCreditsByDateRange(
    from: Date,
    to: Date,
    onUpdate: (credits: Credit[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const fromTimestamp = Timestamp.fromDate(from);
    const toTimestamp = Timestamp.fromDate(to);

    const q = query(
      this.creditsCollection,
      where('purchaseDate', '>=', fromTimestamp),
      where('purchaseDate', '<=', toTimestamp),
      orderBy('purchaseDate', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const credits: Credit[] = [];
        snapshot.forEach((doc) => {
          credits.push({
            ...(doc.data() as Credit),
            id: doc.id,
          });
        });
        onUpdate(credits);
      },
      (error) => {
        console.error('Error listening to credits by date range:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Fetch a credit document by its ID.
   */
  static async getCreditById(creditId: string): Promise<Credit> {
    const docRef = doc(db, 'credits', creditId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Credit document not found');
    }
    return {
      ...(docSnap.data() as Credit),
      id: docSnap.id,
    };
  }

  /**
   * Save a new credit record.
   */
  static async addCredit(credit: Omit<Credit, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = doc(this.creditsCollection);
    const creditToSave: Credit = {
      ...credit,
      id: docRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(docRef, creditToSave);
    return docRef.id;
  }

  /**
   * Overwrite/update an existing credit record.
   */
  static async updateCredit(credit: Credit): Promise<void> {
    const docRef = doc(db, 'credits', credit.id);
    const updatedCredit: Credit = {
      ...credit,
      updatedAt: Timestamp.now(),
    };
    await setDoc(docRef, updatedCredit);
  }

  /**
   * Mark a credit record as fully paid/received.
   */
  static async markAsReceived(creditId: string): Promise<void> {
    const docRef = doc(db, 'credits', creditId);
    const credit = await this.getCreditById(creditId);

    await updateDoc(docRef, {
      status: 'received',
      paidAmount: credit.amount,
      receivedDate: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Record partial/full payment on a credit record.
   */
  static async recordPayment(creditId: string, paymentAmount: number): Promise<void> {
    const docRef = doc(db, 'credits', creditId);
    const credit = await this.getCreditById(creditId);

    const newPaidAmount = credit.paidAmount + paymentAmount;
    const newStatus = newPaidAmount >= credit.amount ? 'received' : 'outstanding';
    
    const updates: any = {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedAt: Timestamp.now(),
    };

    if (newStatus === 'received') {
      updates.receivedDate = Timestamp.now();
    }

    await updateDoc(docRef, updates);
  }

  /**
   * Delete a credit record.
   */
  static async deleteCredit(creditId: string): Promise<void> {
    const docRef = doc(db, 'credits', creditId);
    await deleteDoc(docRef);
  }
}
