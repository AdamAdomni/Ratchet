import { BuildInformation } from './build-information';

export class RatchetInfo {
  // Empty constructor prevents instantiation
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static fetchBuildInformation(): BuildInformation {
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