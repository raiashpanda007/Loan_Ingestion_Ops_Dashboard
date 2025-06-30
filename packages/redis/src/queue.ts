import{redisConnectionConfig} from "./redis";

import { Queue } from "bullmq";


export const LOAN_QUEUE = new Queue("loan-queue", {
    connection: redisConnectionConfig
});