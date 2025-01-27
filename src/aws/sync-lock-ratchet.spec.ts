import { SyncLockRatchet } from './sync-lock-ratchet';
import { DynamoRatchet } from './dynamo-ratchet';
import { Logger } from '../common';
import { JestRatchet } from '../jest';

let mockDR: jest.Mocked<DynamoRatchet>;

describe('#syncLockService', () => {
  beforeEach(() => {
    mockDR = JestRatchet.mock();
  });

  xit('should test sync locks', async () => {
    const svc: SyncLockRatchet = new SyncLockRatchet(mockDR, 'test-table');

    const lockTestValue: string = 'SYNC_LOCK_TEST';

    const aq1: boolean = await svc.acquireLock(lockTestValue);
    expect(aq1).toBe(true);
    const aq2: boolean = await svc.acquireLock(lockTestValue);
    expect(aq2).toBe(false);
    await svc.releaseLock(lockTestValue);
    const aq3: boolean = await svc.acquireLock(lockTestValue);
    expect(aq3).toBe(true);
    await svc.releaseLock(lockTestValue);
  });

  it('should clear expired sync locks', async () => {
    mockDR.fullyExecuteScan.mockResolvedValue([{ lockingKey: 'aa' }, { lockingKey: 'ab' }]);
    mockDR.deleteAllInBatches.mockResolvedValue(2);

    const svc: SyncLockRatchet = new SyncLockRatchet(mockDR, 'test-table');

    const res: number = await svc.clearExpiredSyncLocks();
    Logger.info('Got : %s', res);

    expect(res).toEqual(2);
  });
});
