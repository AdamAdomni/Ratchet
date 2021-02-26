import { Substitute } from '@fluffy-spoon/substitute';
import { SendSSHPublicKeyResponse } from 'aws-sdk/clients/ec2instanceconnect';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '../common/logger';
import { Instance } from 'aws-sdk/clients/ec2';
import { Ec2Ratchet } from './index';

describe('#EC2Ratchet', function () {
  xit('should send a public key', async () => {
    const ratchet: Ec2Ratchet = new Ec2Ratchet();
    const instId: string = 'i-replace_me';
    const pubKey: string = fs.readFileSync(path.join(os.homedir(), '.ssh/id_rsa.pub')).toString();

    const res: SendSSHPublicKeyResponse = await ratchet.sendPublicKeyToEc2Instance(instId, pubKey);

    Logger.info('Got : %j', res);
    expect(res).toBeTruthy();
  });

  xit('should list instances', async () => {
    const ratchet: Ec2Ratchet = new Ec2Ratchet();

    const res: Instance[] = await ratchet.listAllInstances();

    Logger.info('Got : %j', res);
    expect(res).toBeTruthy();
    expect(res.length).toBeGreaterThan(1);
  });

  xit('should start and stop an instance', async () => {
    const ratchet: Ec2Ratchet = new Ec2Ratchet();

    const instId: string = 'i-replace_me';

    Logger.info('First start');
    await ratchet.launchInstance(instId, 1000 * 60);

    Logger.info('Next stop');
    await ratchet.stopInstance(instId, 1000 * 60);

    Logger.info('Complete');
  });
});