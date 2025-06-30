import{redisConnectionConfig} from "./redis";

import { Queue } from "bullmq";


export const LOAN_QUEUE = new Queue("loan-queue", {
    connection: redisConnectionConfig
});

export const FAILED_LOAN_QUEUE = new Queue("failed-loan-queue", {
    connection: redisConnectionConfig
});