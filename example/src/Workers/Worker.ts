import { ApplicationMaster } from '../Application'
import { MasterHandler } from '@david.uhlir/cluster'

export class Worker {
  protected master: MasterHandler<ApplicationMaster>
  constructor(protected readonly name: string) {
    this.master = MasterHandler.getInstance()
    console.log('Initialize main ', this.name, process.pid)
  }

  public test() {
    console.log('Hello world from RPC', process.pid)
    setTimeout(() => this.master.call.pong(), 1000)
  }

  public freeze() {
    while (true);
  }
}
