import { MasterHandler } from '@david.uhlir/cluster'
import { ApplicationMaster } from './Application';

MasterHandler.Initialize(() => new ApplicationMaster())
