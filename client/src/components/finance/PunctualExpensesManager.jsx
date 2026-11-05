import React from 'react';
import ExpensesManager from './ExpensesManager';

/**
 * Adapter wrapper delegating to unified ExpensesManager
 */
export default function PunctualExpensesManager(props) {
  return <ExpensesManager {...props} initialSubTab="punctual" />;
}
