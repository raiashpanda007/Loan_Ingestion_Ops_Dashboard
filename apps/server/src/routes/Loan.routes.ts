import { Router } from "express";
import LoansRequestController from "../controllers/LoansRequest.controller";
import LoansErrorsController from "../controllers/LoansErrors.controller";
const router: Router = Router();
router.post('/request', LoansRequestController);
/**
 * @route   GET /api/loans/errors
 * @desc    Fetch filtered loan error logs
 * @query   loanId?: string
 *          email?: string
 *          phone?: string
 *          flagged?: boolean (as string)
 *          retried?: boolean (as string)
 *          from?: string (ISO date)
 *          to?: string (ISO date)
 *          errorId?: string
 * @access  Public (you can restrict later with auth middleware)
 */
router.get("/errors", LoansErrorsController);

export default router;