import { z as zod } from 'zod';

export const LoanRequestSchema = zod.object({
    loanId: zod.string().min(1, "Loan ID is required"),
    application: zod.object({
        name: zod.string().min(1, "Name is required"),
        age: zod.number().min(18, "Age must be at least 18"),
        email: zod.string().email("Invalid email format"),
        phone: zod.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),

    }),
    amount: zod.number().min(100, "Amount must be at least 100"),
    income: zod.number().min(0, "Income must be a positive number"),
    creditScore: zod.number().min(300, "Credit score must be at least 300"),
    purpose: zod.string().min(1, "Purpose is required"),
    // status: zod.enum(["APPROVED", "REJECTED", "PENDING"]).default("PENDING"),
});



export const ErrorLogFilterSchema = zod.object({
  loanId:  zod.string().optional(),
  errorId: zod.string().optional(),
  email:   zod.string().email().optional(),
  phone:   zod.string().optional(),
  flagged: zod.enum(["true","false"]).optional(),
  retried: zod.enum(["true","false"]).optional(),
  from: zod.string()
    .refine(s => !isNaN(Date.parse(s)), { message: "Invalid from date" })
    .optional(),
  to: zod.string()
    .refine(s => !isNaN(Date.parse(s)), { message: "Invalid to date" })
    .optional(),
});