import { Router } from "express";
import LoansRequestController from "../controllers/LoansRequest.controller";
import LoansErrorsController from "../controllers/LoansErrors.controller";
import incomingRequestsMiddleware from "../middlewares/incoming_requests.middleware";
const router: Router = Router();
router.post('/request',incomingRequestsMiddleware, LoansRequestController);
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
 * @access  Public 
 */
router.get("/errors", LoansErrorsController);
router.get("/geterrors", LoansErrorsController);

export default router;