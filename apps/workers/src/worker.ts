import { Job } from 'bullmq';
import { redisConnectionConfig, client } from '@workspace/redis';
import { LoanRequestSchema } from '@workspace/types';
import { broadcast } from './ws';

export async function processLoan(job: Job) {
    const data = job.data;
    const parsedData = LoanRequestSchema.safeParse(data);

    if (!parsedData.success) {
        broadcast('error', {
            message: 'Invalid data format',
            error: parsedData.error,
            jobId: job.id,
        });
        await storeFailedJob(job.id, parsedData.error, data, 'invalid-data');
        await client.incr('failed_count');
        return;
    }

    const { amount, application, creditScore, income, loanId, purpose } = parsedData.data;

    if (creditScore < 600) {
        broadcast('error', {
            message: 'Credit score too low',
            jobId: job.id,
        });
        await storeFailedJob(job.id, 'Credit score too low', data, 'low-credit-score');
        await client.incr('failed_count');
        return;
    }

    if (amount > 5 * income) {
        broadcast('error', {
            message: 'Loan amount too high',
            jobId: job.id,
        });
        await storeFailedJob(job.id, 'Loan amount too high', data, 'high-loan-amount');
        await client.incr('failed_count');
        return;
    }

    console.log(`Processing loan request for ${application.name} with ID ${loanId}`);

    await client.set(
        `accepted-loan:${loanId}`,
        JSON.stringify(parsedData.data)
    );
    await client.sadd('accepted-loans', `accepted-loan:${loanId}`);

    broadcast('success', {
        message: 'Loan accepted',
        jobId: job.id,
        loanId,
    });
    console.log(`Loan request for ${application.name} with ID ${loanId} processed successfully`);

    await client.incr('processed_count');
}

async function storeFailedJob(
    jobId: string | undefined,
    error: any,
    data: any,
    category: string
) {
    if (!jobId) return;
    const key = `failed-job:${jobId}`;
    await client.set(key, JSON.stringify({ jobId, error, data }));
    await client.sadd(`failed-jobs:${category}`, key);
}
