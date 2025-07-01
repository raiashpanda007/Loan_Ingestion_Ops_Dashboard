import { Worker } from 'bullmq';
import { queue, redisConnectionConfig } from '@workspace/redis';
import {processLoan}  from './worker';


const LOAN_QUEUE = queue.LOAN_QUEUE;
const activeWorkers: Worker[] = [];
const interval = 1000;
const maxWorkers = 10;

export async function manageWorkerPool() {
  setInterval(async () => {
    try {
      const { waiting } = await LOAN_QUEUE.getJobCounts();
      const desiredWorkers = Math.min(maxWorkers, Math.ceil((waiting ?? 0) / 50));
      const current = activeWorkers.length;

      if (desiredWorkers > current) {
        for (let i = current; i < desiredWorkers; i++) {
          const worker = new Worker('loan-queue', processLoan, {
            connection: redisConnectionConfig,
            concurrency: 10,
          });
          activeWorkers.push(worker);
          console.log(`[Scaler] Spawned worker ${i + 1}`);
        }
      } else if (desiredWorkers < current) {
        const toRemove = activeWorkers.splice(desiredWorkers);
        for (const w of toRemove) {
          console.log(`[Scaler] Stopping worker ${w.name}`);
          await w.close();
        }
      }
    } catch (err) {
      console.error('[Scaler] Error during scaling:', err);
    }
  }, interval);
}
