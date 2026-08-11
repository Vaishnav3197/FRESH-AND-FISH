import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Expense } from '../types';

export class ExpenseRepository {
  private static expensesCollection = collection(db, 'expenses');

  /**
   * Listen to all expenses in real-time ordered by date descending.
   */
  static getExpenses(
    onUpdate: (expenses: Expense[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(this.expensesCollection, orderBy('date', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const expenses: Expense[] = [];
        snapshot.forEach((doc) => {
          expenses.push({
            ...(doc.data() as Expense),
            expenseId: doc.id,
          });
        });
        onUpdate(expenses);
      },
      (error) => {
        console.error('Error listening to expenses:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Add a new expense record.
   */
  static async addExpense(expense: Omit<Expense, 'expenseId' | 'createdAt'>): Promise<string> {
    const docRef = doc(this.expensesCollection);
    const expenseToSave: Expense = {
      ...expense,
      expenseId: docRef.id,
      createdAt: Timestamp.now(),
    };
    await setDoc(docRef, expenseToSave);
    return docRef.id;
  }

  /**
   * Update an existing expense record.
   */
  static async updateExpense(expense: Expense): Promise<void> {
    const docRef = doc(db, 'expenses', expense.expenseId);
    await setDoc(docRef, expense);
  }

  /**
   * Delete an expense record.
   */
  static async deleteExpense(expenseId: string): Promise<void> {
    const docRef = doc(db, 'expenses', expenseId);
    await deleteDoc(docRef);
  }
}
