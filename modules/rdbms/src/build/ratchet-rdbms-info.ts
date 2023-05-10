import { BuildInformation } from '@bitblit/ratchet-common/lib/build/build-information.js';

export class RatchetRdbmsInfo {
  // Empty constructor prevents instantiation
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static buildInformation(): BuildInformation {
    const val: BuildInformation = {
      version: 'LOCAL-SNAPSHOT',
      hash: 'LOCAL-HASH',
      branch: 'LOCAL-BRANCH',
      tag: 'LOCAL-TAG',
      timeBuiltISO: 'LOCAL-TIME-ISO',
      notes: 'LOCAL-NOTES',
    };
    return val;
  }
}