/**
 * Utility to convert virtual poker chips to Real Money (INR)
 * Conversion: 10,000 chips = entryAmount 
 */
export function chipsToRupees(chips: number, entryAmount: number): string {
    if (!entryAmount || entryAmount <= 0) return '₹0.00';
    
    const rupees = (chips * entryAmount) / 10000;
    
    // Formatting: 
    // - Show at least ₹0.01 if the value is non-zero
    // - Format to 2 decimal places
    
    if (rupees > 0 && rupees < 0.01) {
        return '₹0.01';
    }
    
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(rupees);
}
