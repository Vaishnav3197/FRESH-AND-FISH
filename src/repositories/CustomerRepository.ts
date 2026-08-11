import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Customer, Credit } from '../types';

export class CustomerRepository {
  private static customersCollection = collection(db, 'customers_v2');

  /**
   * Listen to active customer records in real-time, sorted alphabetically.
   */
  static getCustomers(
    onUpdate: (customers: Customer[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(this.customersCollection);
    
    return onSnapshot(
      q,
      (snapshot) => {
        const customers: Customer[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const isActive = data.active !== false;
          if (isActive) {
            customers.push({
              ...(data as Customer),
              customerId: doc.id,
              isActive: true,
              active: true
            });
          }
        });
        
        // Sort case-insensitive by name (matching Android's CASE_INSENSITIVE_ORDER)
        customers.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
        );
        
        onUpdate(customers);
      },
      (error) => {
        console.error('Error listening to customers:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Listen to a specific customer in real-time.
   */
  static getCustomer(
    customerId: string,
    onUpdate: (customer: Customer | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    const docRef = doc(db, 'customers_v2', customerId);
    
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const isActive = data.active !== false;
          onUpdate({
            ...(data as Customer),
            customerId: docSnap.id,
            isActive: isActive,
            active: isActive
          });
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.error(`Error listening to customer ${customerId}:`, error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Create a new customer profile.
   */
  static async addCustomer(customer: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt' | 'isActive' | 'active'>): Promise<string> {
    const docRef = doc(this.customersCollection);
    const now = Date.now(); // Note: Customer uses Long milliseconds for auditing

    const customerToSave: any = {
      ...customer,
      customerId: docRef.id,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      active: true
    };

    await setDoc(docRef, customerToSave);
    return docRef.id;
  }

  /**
   * Update an existing customer profile.
   */
  static async updateCustomer(customer: Customer): Promise<void> {
    const docRef = doc(db, 'customers_v2', customer.customerId);
    const updatedCustomer: any = {
      ...customer,
      updatedAt: Date.now(), // Milliseconds
      active: customer.isActive !== false
    };
    await setDoc(docRef, updatedCustomer);
  }

  /**
   * Permanently delete a customer profile.
   */
  static async deleteCustomer(customerId: string): Promise<void> {
    const docRef = doc(db, 'customers_v2', customerId);
    await deleteDoc(docRef);
  }

  /**
   * Merge secondary customer record into a primary customer atomically using a write batch.
   */
  static async mergeCustomers(
    primaryCustomer: Customer,
    secondaryCustomer: Customer,
    creditsToMigrate: Credit[]
  ): Promise<void> {
    const batch = writeBatch(db);

    // 1. Migrate credit records
    const creditsCollection = collection(db, 'credits');
    creditsToMigrate.forEach((credit) => {
      const creditDocRef = doc(creditsCollection, credit.id);
      batch.update(creditDocRef, {
        customerId: primaryCustomer.customerId,
        customerName: primaryCustomer.name,
        updatedAt: Timestamp.now(),
      });
    });

    // 2. Update primary customer with recalculated totalDue
    const primaryDocRef = doc(db, 'customers_v2', primaryCustomer.customerId);
    batch.set(primaryDocRef, {
      ...primaryCustomer,
      active: primaryCustomer.isActive !== false,
      updatedAt: Date.now()
    });

    // 3. Soft-delete secondary customer
    const secondaryDocRef = doc(db, 'customers_v2', secondaryCustomer.customerId);
    batch.set(secondaryDocRef, {
      ...secondaryCustomer,
      isActive: false,
      active: false,
      updatedAt: Date.now()
    });

    // 4. Commit batch
    await batch.commit();
  }

  /**
   * Atomically adjust a customer's totalDue balance in Firestore using a transaction.
   */
  static async adjustCustomerDue(customerId: string, delta: number): Promise<void> {
    if (!customerId || customerId.trim() === '') return;
    
    const docRef = doc(db, 'customers_v2', customerId);
    
    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(docRef);
      if (sfDoc.exists()) {
        const currentDue = sfDoc.data().totalDue || 0;
        transaction.update(docRef, { totalDue: currentDue + delta });
      }
    });
  }
}
