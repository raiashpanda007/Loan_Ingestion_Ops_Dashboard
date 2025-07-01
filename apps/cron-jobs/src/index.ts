import cron from 'node-cron';
import { client } from "@workspace/redis";
import Prisma from '@workspace/db';

console.log("Cron Service started ....");

cron.schedule('*/30 * * * * *', async () => {
  console.log("Running cron job every 5 seconds ... ", new Date().toISOString());

  try {
    // === 1. Process Accepted Loans ===
    const acceptedLoanKeys = await client.smembers('accepted-loans');
    const acceptedLoans: any[] = [];

    for (const key of acceptedLoanKeys) {
      const loanData = await client.get(key);
      if (loanData) {
        
        acceptedLoans.push(JSON.parse(loanData));
        await client.del(key);
      }
    }

    await client.del('accepted-loans');

    if (acceptedLoans.length > 0) {
      const result = await Prisma.loan.createMany({ data: acceptedLoans });
      console.log("✅ Accepted loans saved in DB:", result.count);
    }

    // === 2. Process Failed Loans with LoanError relation ===
    const failedLoanKeys = await client.smembers('failed-loans');
    const failedLoanTxs = [];

    for (const redisKey of failedLoanKeys) {
      const raw = await client.get(redisKey);
      if (!raw) continue;

      const { jobId, error: errorCode, data } = JSON.parse(raw);
      const {
        loanId,
        amount,
        income,
        creditScore,
        purpose,
        application: { name, age, email, phone },
      } = data;

      const tx = Prisma.failedLoan.create({
        data: {
          loanId:loanId,
          name:name,
          age:age,
          email:email,
          phone:phone,
          amount:amount,
          income:income,
          creditScore:creditScore,
          purpose:purpose,
          flagged: false,
          retried: false,
          errors: {
            create: [
              {
                code: errorCode,
              },
            ],
          },
        },
      });

      failedLoanTxs.push(tx);
      await client.del(redisKey);
    }

    await client.del('failed-loans');

    if (failedLoanTxs.length > 0) {
      await Prisma.$transaction(failedLoanTxs);
      console.log(`❌ Failed loans saved in DB: ${failedLoanTxs.length}`);
    }

  } catch (error) {
    console.error("🚨 Error in cron job: ", error);
  }
});
