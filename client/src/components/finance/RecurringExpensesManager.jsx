import React from 'react';
import ExpensesManager from './ExpensesManager';

/**
 * Adapter wrapper delegating to unified ExpensesManager
 */
export default function RecurringExpensesManager(props) {
  return <ExpensesManager {...props} initialSubTab="recurring" />;
}
