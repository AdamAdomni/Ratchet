import * as TunnelSsh from 'tunnel-ssh';
import { Logger } from '@bitblit/ratchet-common/lib/logger/logger.js';
import { SshTunnelContainer } from './model/ssh/ssh-tunnel-container.js';
import { SshTunnelConfig } from './model/ssh/ssh-tunnel-config.js';

export class SshTunnelService {
  public async shutdown(ssh: SshTunnelContainer): Promise<boolean> {
    if (!ssh.connection) {
      Logger.info('Not shutting down tunnel - non-tunnel passed');
      return false;
    }
    try {
      Logger.info('Shutting down SSH Tunnel');
      ssh.connection.end();
      ssh.server.close();
      return true;
    } catch (err) {
      Logger.error('Error closing ssh tunnel : %s', err);
      return false;
    }
  }

  public async createSSHTunnel(
    sshOptions: SshTunnelConfig,
    dstHost: string,
    dstPort: number,
    localPort: number
  ): Promise<SshTunnelContainer> {
    const tunnelOptions = {
      autoClose: true,
    };
    const serverOptions = {
      port: localPort,
    };
    const forwardOptions = {
      srcAddr: 'localhost', //'0.0.0.0',
      srcPort: localPort,
      dstAddr: dstHost,
      dstPort: dstPort,
    };

    const [server, connection] = await TunnelSsh.createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);

    server.on('error', (err: Error) => {
      Logger.warn('SSH Server Error : %s', err);
    });

    const rval: SshTunnelContainer = {
      tunnelOptions: tunnelOptions,
      serverOptions: serverOptions,
      sshOptions: sshOptions,
      forwardOptions: forwardOptions,
      server: server,
      connection: connection,
    };

    return rval;
  }
}