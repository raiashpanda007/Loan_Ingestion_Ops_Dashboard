import { Router } from "express";
import LoansRequestController from "../controllers/LoansRequest.controller";
const router: Router = Router();
router.post('/request', LoansRequestController);

export default router;