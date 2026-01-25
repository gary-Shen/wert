import { DateTime } from "luxon";

/**
 * Calculates the current value of a fixed asset using straight-line depreciation.
 */
export function calculateDepreciation(
  purchasePrice: number | string,
  purchaseDate: string | Date,
  lifespanMonths: number | string,
  currentDate: string | Date = new Date(),
  salvageValue: number | string = 0
): number {
  const price = typeof purchasePrice === 'string' ? parseFloat(purchasePrice) : purchasePrice;
  const life = typeof lifespanMonths === 'string' ? parseFloat(lifespanMonths) : lifespanMonths;
  const salvage = typeof salvageValue === 'string' ? parseFloat(salvageValue) : salvageValue;

  const start = DateTime.fromJSDate(new Date(purchaseDate));
  const now = DateTime.fromJSDate(new Date(currentDate));
  
  if (life <= 0) return price;

  // Calculate generic months passed
  const { months } = now.diff(start, "months").toObject();
  const monthsPassed = Math.max(0, months || 0);

  if (monthsPassed >= life) {
    return salvage;
  }

  const depreciableAmount = price - salvage;
  const monthlyDepreciation = depreciableAmount / life;
  const totalDepreciation = monthlyDepreciation * monthsPassed;

  return Math.max(salvage, price - totalDepreciation);
}

/**
 * Calculates the remaining principal of a liability assuming simple monthly principal payments.
 */
export function calculateSimpleLoanAmortization(
  initialLoan: number | string,
  monthlyPayment: number | string,
  repaymentStartDate: string | Date,
  currentDate: string | Date = new Date()
): number {
  const loan = typeof initialLoan === 'string' ? parseFloat(initialLoan) : initialLoan;
  const payment = typeof monthlyPayment === 'string' ? parseFloat(monthlyPayment) : monthlyPayment;

  const start = DateTime.fromJSDate(new Date(repaymentStartDate));
  const now = DateTime.fromJSDate(new Date(currentDate));
  
  const { months } = now.diff(start, "months").toObject();
  const monthsPassed = Math.max(0, months || 0);

  const totalPaid = payment * monthsPassed;
  return Math.max(0, loan - totalPaid);
}
