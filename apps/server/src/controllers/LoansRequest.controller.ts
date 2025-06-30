import { asyncHandler,Response } from "../utils";
import {queue} from "@workspace/redis"
import dotenv from 'dotenv-flow'; 
dotenv.config(); 
const LoansRequestController = asyncHandler(async (req,res) =>{
    console.log("Received loan request:", req.body);
    const LOAN_QUEUE = queue.LOAN_QUEUE;
    const body = req.body;

    if (!body) {
        return res.status(400).json(new Response(400, "Bad Request", "Request body is required"));
    }

    const queued = await LOAN_QUEUE.add('loan_request', body, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
    });
    console.log("Queued job:", queued.id);

    if (!queued) {
        return res.status(500).json(new Response(500, "Internal Server Error", "Failed to queue loan request"));
    }
    return res.status(200).json(new Response(200, "Success", { jobId: queued.id }));
})

export default LoansRequestController;