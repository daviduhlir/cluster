import { WorkerExample } from './WorkerExample';

const fork1 = new WorkerExample({name: 'Worker 1'});
(global as any).fork = fork1;
//const fork2 = new WorkerExample(tt, {name: 'Worker 2'});
// const fork3 = new WorkerExample(tt, {name: 'Worker 3'});
