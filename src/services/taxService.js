/**
 * FinGenius Tax Calculation Service
 * Covers Indian Income Tax — Old Regime vs New Regime (FY 2024-25 / Budget 2025)
 */

// ── New Regime slabs (FY 2024-25 post Budget 2024) ────────────────────────────
const NEW_SLABS = [
  { upto: 300000, rate: 0 },
  { upto: 700000, rate: 0.05 },
  { upto: 1000000, rate: 0.10 },
  { upto: 1200000, rate: 0.15 },
  { upto: 1500000, rate: 0.20 },
  { upto: Infinity, rate: 0.30 }
];

// ── Old Regime slabs ──────────────────────────────────────────────────────────
const OLD_SLABS = [
  { upto: 250000, rate: 0 },
  { upto: 500000, rate: 0.05 },
  { upto: 1000000, rate: 0.20 },
  { upto: Infinity, rate: 0.30 }
];

const CESS_RATE = 0.04;
const STANDARD_DEDUCTION_NEW = 75000;   // Budget 2024
const STANDARD_DEDUCTION_OLD = 50000;
const MAX_80C = 150000;
const MAX_80D_SELF = 25000;
const MAX_80D_SENIOR_PARENTS = 50000;
const MAX_80CCD1B = 50000;   // Additional NPS

const calcTaxOnSlabs = (taxableIncome, slabs) => {
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (taxableIncome <= prev) break;
    const slice = Math.min(taxableIncome, slab.upto) - prev;
    tax += slice * slab.rate;
    prev = slab.upto;
  }
  return tax;
};

const addCess = (tax) => Math.round(tax * (1 + CESS_RATE));

/**
 * Calculate tax under both regimes and recommend the better one
 * @param {Object} input
 */
const calculateTax = (input) => {
  const {
    grossSalary = 0,
    hra = 0,
    otherIncome = 0,
    deduction80C = 0,
    deduction80D = 0,
    deduction80CCD1B = 0,
    deductionHRA = 0,
    deductionHomeLoanInterest = 0,
    otherDeductions = 0,
    age = 30
  } = input;

  const totalGross = grossSalary + otherIncome;

  // ── New Regime ────────────────────────────────────────────────────
  const newTaxableIncome = Math.max(0, totalGross - STANDARD_DEDUCTION_NEW);
  let newTax = calcTaxOnSlabs(newTaxableIncome, NEW_SLABS);
  // Rebate u/s 87A: if taxable income <= 7L, tax = 0
  if (newTaxableIncome <= 700000) newTax = 0;
  const newTaxWithCess = addCess(newTax);

  // ── Old Regime ────────────────────────────────────────────────────
  const capped80C = Math.min(deduction80C, MAX_80C);
  const capped80D = Math.min(deduction80D, age >= 60 ? MAX_80D_SENIOR_PARENTS : MAX_80D_SELF);
  const capped80CCD1B = Math.min(deduction80CCD1B, MAX_80CCD1B);

  const totalDeductions = STANDARD_DEDUCTION_OLD
    + capped80C
    + capped80D
    + capped80CCD1B
    + deductionHRA
    + deductionHomeLoanInterest
    + otherDeductions;

  const oldTaxableIncome = Math.max(0, totalGross - totalDeductions);
  let oldTax = calcTaxOnSlabs(oldTaxableIncome, OLD_SLABS);
  // Rebate u/s 87A (old regime): if taxable income <= 5L
  if (oldTaxableIncome <= 500000) oldTax = 0;
  const oldTaxWithCess = addCess(oldTax);

  // ── Recommendation ────────────────────────────────────────────────
  const recommendedRegime = newTaxWithCess <= oldTaxWithCess ? 'new' : 'old';
  const taxSaving = Math.abs(oldTaxWithCess - newTaxWithCess);

  // ── Missed deductions (if on old regime) ─────────────────────────
  const missedDeductions = [];
  if (deduction80C < MAX_80C) {
    missedDeductions.push({
      label: '80C (ELSS/PPF/LIC)',
      maxAmount: MAX_80C,
      currentAmount: deduction80C,
      gap: MAX_80C - deduction80C
    });
  }
  if (deduction80D < MAX_80D_SELF) {
    missedDeductions.push({
      label: '80D Health Insurance',
      maxAmount: MAX_80D_SELF,
      currentAmount: deduction80D,
      gap: MAX_80D_SELF - deduction80D
    });
  }
  if (deduction80CCD1B < MAX_80CCD1B) {
    missedDeductions.push({
      label: '80CCD(1B) NPS Extra',
      maxAmount: MAX_80CCD1B,
      currentAmount: deduction80CCD1B,
      gap: MAX_80CCD1B - deduction80CCD1B
    });
  }

  return {
    grossIncome: totalGross,
    newRegime: {
      taxableIncome: newTaxableIncome,
      tax: newTaxWithCess
    },
    oldRegime: {
      taxableIncome: oldTaxableIncome,
      totalDeductions,
      tax: oldTaxWithCess
    },
    recommendedRegime,
    taxSaving,
    missedDeductions
  };
};

module.exports = { calculateTax };
