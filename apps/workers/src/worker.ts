import { Job } from 'bullmq';
import { client } from '@workspace/redis';
import { LoanRequestSchema } from '@workspace/types';
import { broadcast } from './ws';

export async function processLoan(job: Job) {
    const data = job.data;
    const parsedData = LoanRequestSchema.safeParse(data);

    if (!parsedData.success) {
        const errorCode = 'INVALID_DATA_FORMAT';
        broadcast('error', {
            message: 'Invalid data format',
            error: errorCode,
            jobId: job.id,
        });
        await storeFailedJob(job.id, errorCode, data);
        await client.incr('failed_count');
        const getCount = await client.get('failed_count');
        broadcast('count:failed', {    
            message: 'Failed count updated',
            count: getCount ? parseInt(getCount, 10) : 0,
            jobId: job.id,
        });
        console.error(`Job ${job.id} failed due to invalid data format`, parsedData.error);
        return;
    }

    const { amount, application, creditScore, income, loanId } = parsedData.data;

    if (creditScore < 600) {
        const errorCode = 'LOW_CREDIT_SCORE';
        broadcast('error', {
            message: 'Credit score too low',
            error: errorCode,
            jobId: job.id,
        });
        await storeFailedJob(job.id, errorCode, data);
        await client.incr('failed_count');
        const getCount = await client.get('failed_count');
        broadcast('count:failed', {
            message: 'Failed count updated',
            count: getCount ? parseInt(getCount, 10) : 0,      
            jobId: job.id,
        });
        return;
    }

    if (amount > 5 * income) {
        const errorCode = 'LOAN_AMOUNT_HIGH';
        broadcast('error', {
            message: 'Loan amount too high',
            error: errorCode,
            jobId: job.id,
        });
        await storeFailedJob(job.id, errorCode, data);
        await client.incr('failed_count');
        const getCount = await client.get('failed_count');
        broadcast('count:failed', {
            message: 'Failed count updated',
            count: getCount ? parseInt(getCount, 10) : 0,   
            jobId: job.id,
        });
        return;
    }

    console.log(`Processing loan request for ${application.name} with ID ${loanId}`);
    const loanData = {
        loanId: parsedData.data.loanId,
        name: application.name,
        age: application.age,
        email: application.email,
        phone: application.phone,
        amount: parsedData.data.amount,
        income: parsedData.data.income,
        creditScore: parsedData.data.creditScore,
        purpose: parsedData.data.purpose,
        createdAt: new Date(),
    }
    await client.set(`accepted-loan:${loanId}`, JSON.stringify(loanData));
    await client.sadd('accepted-loans', `accepted-loan:${loanId}`);

    broadcast('success', {
        message: 'Loan accepted',
        jobId: job.id,
        loanId,
    });

    console.log(`Loan request for ${application.name} with ID ${loanId} processed successfully`);
    
    // INCREMENT AND BROADCAST - THIS WAS MISSING THE BROADCAST!
    await client.incr('processed_count');
    const getProcessedCount = await client.get('processed_count');
    
    // 🔥 ADD THIS BROADCAST - This was missing!
    broadcast('count:processed', {
        message: 'Processed count updated',
        count: getProcessedCount ? parseInt(getProcessedCount, 10) : 0,
        jobId: job.id,
        loanId,
    });
}

async function storeFailedJob(
    jobId: string | undefined,
    errorCode: string,
    data: any
) {
    if (!jobId) return;
    const key = `failed-loans:${errorCode}:${jobId}`;
    await client.set(key, JSON.stringify({ jobId, error: errorCode, data: { ...data, createdAt: new Date() } }));
    await client.sadd('failed-loans', key);
}