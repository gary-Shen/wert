/**
 * 自动估值计算器
 * 纯数学模块，无外部依赖
 */

/**
 * 计算两个日期之间的月份差
 */
function monthsDiff(start: Date, end: Date): number {
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const days = end.getDate() - start.getDate();
  // 加上日差的小数部分
  return years * 12 + months + days / 30;
}

/**
 * 直线法折旧计算
 * @param purchasePrice 购入价格
 * @param purchaseDate 购入日期
 * @param lifespanMonths 使用年限 (月)
 * @param salvageValue 残值 (默认 0)
 * @param currentDate 当前日期 (默认 now)
 * @returns 当前剩余价值
 */
export function calculateDepreciation(
  purchasePrice: number,
  purchaseDate: string | Date,
  lifespanMonths: number,
  salvageValue: number = 0,
  currentDate: Date = new Date()
): number {
  if (lifespanMonths <= 0) return purchasePrice;

  const start = new Date(purchaseDate);
  const monthsPassed = Math.max(0, monthsDiff(start, currentDate));

  // 超过使用年限，返回残值
  if (monthsPassed >= lifespanMonths) return salvageValue;

  const depreciableAmount = purchasePrice - salvageValue;
  const monthlyDepreciation = depreciableAmount / lifespanMonths;
  const totalDepreciation = monthlyDepreciation * monthsPassed;

  return Math.max(salvageValue, purchasePrice - totalDepreciation);
}

/**
 * 简单等额本金还贷计算
 * @param initialLoan 初始贷款总额
 * @param monthlyPayment 每月还款额
 * @param startDate 还款起始日期
 * @param currentDate 当前日期 (默认 now)
 * @returns 当前剩余本金
 */
export function calculateLoanAmortization(
  initialLoan: number,
  monthlyPayment: number,
  startDate: string | Date,
  currentDate: Date = new Date()
): number {
  const start = new Date(startDate);
  const monthsPassed = Math.max(0, monthsDiff(start, currentDate));

  const totalPaid = monthlyPayment * monthsPassed;
  return Math.max(0, initialLoan - totalPaid);
}
