import AWS from 'aws-sdk';
import { DaemonProcessState } from './daemon-process-state';
import { DaemonUtil } from './daemon-util';
import { Logger } from '../../common/logger';
import fs, { ReadStream } from 'fs';
import { DaemonProcessCreateOptions } from './daemon-process-create-options';
import { JestRatchet } from '../../jest';
import { LoggerLevelName, PromiseRatchet } from '../../common';
import { Subject } from 'rxjs';
import { PassThrough } from 'stream';
import { CsvRatchet } from '../../node-csv';
import { TestItem } from '../../node-csv/csv-ratchet.spec';
import {S3CacheRatchetLike} from "../s3-cache-ratchet-like";
import {S3CacheRatchet} from "../s3-cache-ratchet";

let mockS3CR: jest.Mocked<S3CacheRatchetLike>;

describe('#DaemonUtil', function () {
  beforeEach(() => {
    mockS3CR = JestRatchet.mock();
  });

  it('should test the daemon util', async () => {
    mockS3CR.getDefaultBucket.mockReturnValueOnce('TEST-BUCKET');
    mockS3CR.fetchMetaForCacheFile.mockResolvedValue({ Metadata: { daemon_meta: '{"id":"testid", "completedEpochMS":123456}' } });
    mockS3CR.preSignedDownloadUrlForCacheFile.mockReturnValueOnce('https://test-link');

    const t1: DaemonProcessState = await DaemonUtil.stat(mockS3CR, 'test1.csv');
    Logger.info('Got : %j', t1);
    expect(t1).not.toBeNull();
    expect(t1.link).not.toBeNull();

    /*
        let id = 'test';
        const newDaemonOptions: DaemonProcessCreateOptions = {
            title: 'test',
            contentType: 'text/csv',
            group: 'NA',
            meta: {},
            targetFileName: 'test.csv'
        };

        const t2: DaemonProcessState = await DaemonUtil.start(cache, id,'test1.csv', newDaemonOptions);
        Logger.info('Got : %j', t2);


    const t2: DaemonProcessState = await DaemonUtil.updateMessage(mockS3CR, 'test1.csv', 'msg : ' + new Date());
    Logger.info('Got : %j', t2);

    const result: DaemonProcessState = await DaemonUtil.stat(mockS3CR, 'test1.csv');

    Logger.info('Got : %j', result);

    expect(result).toBeTruthy();
    Logger.info('Got objects : %j', result);
         */
  });

  xit('should test the daemon util streaming', async () => {
    const s3: AWS.S3 = new AWS.S3({ region: 'us-east-1' });
    const cache: S3CacheRatchetLike = new S3CacheRatchet(s3, 'test-bucket');
    const key: string = 's3-cache-ratchet.spec.ts';

    const newDaemonOptions: DaemonProcessCreateOptions = {
      title: 'test',
      contentType: 'text/plain',
      group: 'NA',
      meta: {},
      targetFileName: 's3-cache-ratchet.spec.ts',
    };

    const t2: DaemonProcessState = await DaemonUtil.start(cache, key, 's3-cache-ratchet.spec.ts', newDaemonOptions);

    const t1: DaemonProcessState = await DaemonUtil.stat(cache, key);
    Logger.info('Got : %j', t1);

    const stream: ReadStream = fs.createReadStream('test/aws/s3-cache-ratchet.spec.ts');
    const result: DaemonProcessState = await DaemonUtil.streamDataAndFinish(cache, key, stream);

    expect(result).toBeTruthy();
    Logger.info('Got objects : %j', result);
  });

  xit('should stream objects to a csv', async () => {
    Logger.setLevel(LoggerLevelName.debug);
    const sub: Subject<TestItem> = new Subject<TestItem>();
    const out: PassThrough = new PassThrough();
    const s3: AWS.S3 = new AWS.S3({ region: 'us-east-1' });
    const cache: S3CacheRatchet = new S3CacheRatchet(s3, 'test-bucket');
    const key: string = 'test.csv';

    const newDaemonOptions: DaemonProcessCreateOptions = {
      title: 'test',
      contentType: 'text/csv',
      group: 'NA',
      meta: {},
      targetFileName: 'test.csv',
    };
    const t2: DaemonProcessState = await DaemonUtil.start(cache, key, key, newDaemonOptions);

    const dProm: Promise<DaemonProcessState> = DaemonUtil.streamDataAndFinish(cache, key, out);

    const prom: Promise<number> = CsvRatchet.streamObjectsToCsv<TestItem>(sub, out); //, opts);

    for (let i = 1; i < 6; i++) {
      Logger.debug('Proc : %d', i);
      sub.next({ a: i, b: 'test ' + i + ' ,,' });
      await PromiseRatchet.wait(10);
    }
    sub.complete();

    Logger.debug('Waiting on write');

    const result: number = await prom;
    Logger.debug('Write complete');

    const val: DaemonProcessState = await dProm;

    expect(result).toEqual(5);
    Logger.debug('Have res : %d and val : \n%j', result, val);
  });
});
