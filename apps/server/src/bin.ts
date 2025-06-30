import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import LoanRouter from './routes/Loan.routes';  

dotenv.config();


export const App: Express = express();
App.use(cors({
    origin: 'http://localhost:3000',
}));
App.use(express.json());
App.use(express.urlencoded({ extended: true }));




App.get('/health-check', (req, res) => {
    res.send('Hello World!');
});

App.use('/api/loan',LoanRouter);


