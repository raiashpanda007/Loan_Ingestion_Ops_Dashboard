import { asyncHandler } from "../utils";
import { client } from "@workspace/redis";
const incomingRequestsMiddleware = asyncHandler(async (req, res, next) => {
    await client.incr('loan:incoming_count');

});

export default incomingRequestsMiddleware;
