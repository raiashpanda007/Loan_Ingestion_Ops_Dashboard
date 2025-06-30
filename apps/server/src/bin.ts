import express,{Express} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();


export const App: Express = express();
App.use(cors({
    origin: '*', 
}));
App.use(express.json());
App.get('/', (req, res) => {
    res.send('Hello World!');
});


