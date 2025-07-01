import { asyncHandler, Response } from "../utils";
import { ErrorLogFilterSchema } from "@workspace/types";
import Prisma from "@workspace/db";

const LoansErrorsController = asyncHandler(async (req, res) => {
  const parsed = ErrorLogFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json(new Response(400, "Invalid request data", { errors: parsed.error.errors }));
  }

  const { loanId, email, phone, flagged, retried, from, to, errorId } = parsed.data;
  const filters: any = {};

  if (loanId) filters.loanId = loanId;
  if (email) filters.email = email;
  if (phone) filters.phone = phone;
  if (flagged !== undefined) filters.flagged = flagged === "true";
  if (retried !== undefined) filters.retried = retried === "true";

  // DATE RANGE ON failedAt
  const createdAtFilter: any = {};
  if (from) createdAtFilter.gte = new Date(from);
  if (to) createdAtFilter.lte = new Date(to);
  if (Object.keys(createdAtFilter).length > 0) {
    filters.createdAt = createdAtFilter;
  }

  // FILTER BY errorId (nested relation)
  if (errorId) {
    filters.errors = { some: { id: errorId } };
  }

  const failedLoans = await Prisma.failedLoan.findMany({
    where: filters,
    include: { errors: true },
    orderBy: { failedAt: "desc" },   // also sort by failure time
  });

  return res
    .status(200)
    .json(new Response(200, "Loans errors fetched successfully", failedLoans));
});

export default LoansErrorsController;
