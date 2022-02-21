import { WorkerExample } from './WorkerExample';
import * as cluster from 'cluster';

if (cluster.isMaster) {
    console.log('Starting main', process.pid);
}

class Common {
    public hello() {
        console.log('hello');
    }
}
const tt = new Common();

const fork1 = new WorkerExample(tt, {name: 'Worker 1'});
const fork2 = new WorkerExample(tt, {name: 'Worker 2'});
const fork3 = new WorkerExample(tt, {name: 'Worker 3'});

fork1.fork.pong();
