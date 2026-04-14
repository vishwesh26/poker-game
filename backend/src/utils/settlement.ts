export interface Participant {
  name: string;
  net: number;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

/**
 * Greedy algorithm to match debtors with creditors.
 * Minimizes the number of transactions.
 */
export function calculateTransactions(participants: Participant[]): Transaction[] {
  // Filter out tiny balances (less than 1 paisa) to avoid floating point issues
  const debtors = participants
    .filter(p => p.net < -0.009)
    .map(p => ({ name: p.name, net: Math.abs(p.net) }))
    .sort((a, b) => a.net - b.net); // Smallest first as requested

  const creditors = participants
    .filter(p => p.net > 0.009)
    .map(p => ({ name: p.name, net: p.net }))
    .sort((a, b) => a.net - b.net);

  const transactions: Transaction[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    
    // Amount to settle is the minimum of what debtor owes or creditor needs
    const amount = Math.min(debtor.net, creditor.net);
    
    if (amount > 0) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: parseFloat(amount.toFixed(2))
      });

      debtor.net -= amount;
      creditor.net -= amount;
    }

    if (debtor.net < 0.01) dIdx++;
    if (creditor.net < 0.01) cIdx++;
  }

  return transactions;
}
