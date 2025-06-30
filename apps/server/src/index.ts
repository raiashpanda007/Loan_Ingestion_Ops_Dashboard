import cluster from 'cluster';
import os from 'os';
import { App } from './bin';



const PORT = process.env.PORT || 3001;

// Right now using half of the cpu cores for the server
const cpus = os.cpus().length/2; 


if(cluster.isPrimary) {
    console.log("Primary process is running", process.pid);
    console.log(`Forking ${cpus} workers...`);
    for(let i = 0; i < cpus; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
    App.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} with process id: ${process.pid}`);
    });
}