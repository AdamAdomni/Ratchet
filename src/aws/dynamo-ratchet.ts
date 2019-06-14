/*
    Helper functions for DynamoDB
*/


import * as AWS from 'aws-sdk';
import {Logger} from '../common/logger';
import {PromiseResult} from 'aws-sdk/lib/request';
import {DurationRatchet} from '../common/duration-ratchet';
import {
    BatchWriteItemOutput, DeleteItemInput,
    DeleteItemOutput,
    GetItemOutput,
    PutItemInput,
    QueryInput,
    ScanInput
} from 'aws-sdk/clients/dynamodb';
import {AWSError} from 'aws-sdk';
import {DocumentClient} from 'aws-sdk/lib/dynamodb/document_client';
import PutItemOutput = DocumentClient.PutItemOutput;
import GetItemInput = DocumentClient.GetItemInput;
import {DynamoCountResult} from './model/dynamo-count-result';

export class DynamoRatchet {

    constructor(private awsDDB: AWS.DynamoDB.DocumentClient) {
        if (!awsDDB) {
            throw ('awsDDB may not be null');
        }
    }


    public getDDB(): AWS.DynamoDB.DocumentClient {
        return this.awsDDB;
    }

    public async fullyExecuteQueryCount<T>(qry: QueryInput, delayMS: number = 250) : Promise<DynamoCountResult> {
        try {
            qry.Select = 'COUNT'; // Force it to be a count query
            Logger.debug('Executing count query : %j', qry);

            const rval: DynamoCountResult = {
                count:0,
                scannedCount: 0,
                pages: 0
            };

            const start: number = new Date().getTime();

            let qryResults: PromiseResult<any, any> = await this.awsDDB.query(qry).promise();
            rval.count += qryResults['Count'];
            rval.scannedCount += qryResults['ScannedCount'];
            rval.pages++;

            while (qryResults.LastEvaluatedKey) {
                Logger.debug('Found more rows - requery with key %j', qryResults.LastEvaluatedKey);
                qry['ExclusiveStartKey'] = qryResults.LastEvaluatedKey;
                qryResults = await this.awsDDB.query(qry).promise();
                rval.count += qryResults['Count'];
                rval.scannedCount += qryResults['ScannedCount'];
                rval.pages++;
                Logger.info('Rval is now %j', rval);
            }

            const end: number = new Date().getTime();

            Logger.info('Finished, returned %j in %s for %j', rval, DurationRatchet.formatMsDuration(end - start, true), qry);
            return rval;
        }
        catch (err) {
            Logger.error('Failed with %s, q: %j',err, qry, err);
            return null;
        }

    }

    public async fullyExecuteQuery<T>(qry: QueryInput, delayMS: number = 250, softLimit: number = null) : Promise<T[]> {
        try {
            Logger.debug('Executing query : %j', qry);
            const start: number = new Date().getTime();

            let rval: T[] = [];

            Logger.info("Pulling %j", qry);

            let qryResults: PromiseResult<any, any> = await this.awsDDB.query(qry).promise();
            rval = rval.concat(qryResults.Items as T[]);

            while (qryResults.LastEvaluatedKey && (softLimit===null || rval.length<softLimit)) {
                Logger.debug('Found more rows - requery with key %j', qryResults.LastEvaluatedKey);
                qry['ExclusiveStartKey'] = qryResults.LastEvaluatedKey;
                qryResults = await this.awsDDB.query(qry).promise();
                rval = rval.concat(qryResults.Items);
                Logger.info('Rval is now %d items', rval.length);
            }

            const end: number = new Date().getTime();

            Logger.info('Finished, returned %d results in %s for %j', rval.length, DurationRatchet.formatMsDuration(end - start, true), qry);
            return rval;
        }
        catch (err) {
            Logger.error('Failed with %s, q: %j',err, qry, err);
            return [];
        }

    }

    public async fullyExecuteScanCount<T>(qry: ScanInput, delayMS: number = 250) : Promise<DynamoCountResult> {
        try {
            const rval: DynamoCountResult = {
                count:0,
                scannedCount: 0,
                pages: 0
            };


            Logger.debug('Executing scan count : %j', qry);
            const start: number = new Date().getTime();

            Logger.info("Pulling %j", qry);

            let qryResults: PromiseResult<any, any> = await this.awsDDB.scan(qry).promise();
            rval.count += qryResults['Count'];
            rval.scannedCount += qryResults['ScannedCount'];
            rval.pages++;

            while (qryResults.LastEvaluatedKey) {
                Logger.debug('Found more rows - requery with key %j', qryResults.LastEvaluatedKey);
                qry['ExclusiveStartKey'] = qryResults.LastEvaluatedKey;
                qryResults = await this.awsDDB.query(qry).promise();
                rval.count += qryResults['Count'];
                rval.scannedCount += qryResults['ScannedCount'];
                rval.pages++;
                Logger.info('Rval is now %j', rval);
            }

            const end: number = new Date().getTime();

            Logger.info('Finished, returned %j in %s for %j', rval, DurationRatchet.formatMsDuration(end - start, true), qry);
            return rval;
        }
        catch (err) {
            Logger.error('Failed with %s, q: %j',err, qry, err);
            return null;
        }

    }

    public async fullyExecuteScan<T>(qry: ScanInput, delayMS: number = 250, softLimit: number = null) : Promise<T[]> {
        try {
            Logger.debug('Executing scan : %j', qry);
            const start: number = new Date().getTime();

            let rval: T[] = [];

            Logger.info("Pulling %j", qry);

            let qryResults: PromiseResult<any, any> = await this.awsDDB.scan(qry).promise();
            rval = rval.concat(qryResults.Items as T[]);

            while (qryResults.LastEvaluatedKey && (softLimit===null || rval.length<softLimit)) {
                Logger.debug('Found more rows - requery with key %j', qryResults.LastEvaluatedKey);
                qry['ExclusiveStartKey'] = qryResults.LastEvaluatedKey;
                qryResults = await this.awsDDB.query(qry).promise();
                rval = rval.concat(qryResults.Items);
                Logger.info('Rval is now %d items', rval.length);
            }

            const end: number = new Date().getTime();

            Logger.info('Finished, returned %d results in %s for %j', rval.length, DurationRatchet.formatMsDuration(end - start, true), qry);
            return rval;
        }
        catch (err) {
            Logger.error('Failed with %s, q: %j',err, qry, err);
            return [];
        }

    }

    public async writeAllInBatches<T>(tableName: string, elements: T[], batchSize: number): Promise<number> {
        if (!batchSize || batchSize<2) {
            throw new Error('Batch size needs to be at least 2, was '+batchSize);
        }

        let rval: number = 0;
        if (!!elements && elements.length > 0) {
            let batchItems: any[] = [];
            elements.forEach(el => {
                batchItems.push(
                    {
                        PutRequest: {
                            Item: el,
                            ReturnConsumedCapacity: 'TOTAL',
                            TableName: tableName
                        }
                    });
            });
            Logger.info('Processing %d batch items to %s', batchItems.length, tableName);

            while (batchItems.length > 0) {
                const curBatch: any[] = batchItems.slice(0, Math.min(batchItems.length, batchSize));
                batchItems = batchItems.slice(curBatch.length);
                const params: any = {
                    RequestItems: {},
                    ReturnConsumedCapacity: 'TOTAL',
                    ReturnItemCollectionMetrics: 'SIZE'
                };
                params.RequestItems[tableName] = curBatch;

                const batchResults: PromiseResult<BatchWriteItemOutput, AWSError> = await this.awsDDB.batchWrite(params).promise();
                rval += curBatch.length;
                Logger.debug('%d Remain, Batch Results : %j', batchItems.length, batchResults);
            }
        }
        return rval;
    }

    public async deleteAllInBatches(tableName: string, keys: any[], batchSize: number): Promise<number> {
        if (!batchSize || batchSize<2) {
            throw new Error('Batch size needs to be at least 2, was '+batchSize);
        }

        let rval: number = 0;
        if (!!keys && keys.length > 0) {
            let batchItems: any[] = [];
            keys.forEach(el => {
                batchItems.push(
                    {
                        DeleteRequest: {
                            Key: el,
                            ReturnConsumedCapacity: 'TOTAL',
                            TableName: tableName
                        }
                    });
            });
            Logger.info('Processing %d DeleteBatch items to %s', batchItems.length, tableName);

            while (batchItems.length > 0) {
                const curBatch: any[] = batchItems.slice(0, Math.min(batchItems.length, batchSize));
                batchItems = batchItems.slice(curBatch.length);
                const params: any = {
                    RequestItems: {},
                    ReturnConsumedCapacity: 'TOTAL',
                    ReturnItemCollectionMetrics: 'SIZE'
                };
                params.RequestItems[tableName] = curBatch;

                const batchResults: PromiseResult<BatchWriteItemOutput, AWSError> = await this.awsDDB.batchWrite(params).promise();
                rval += curBatch.length;
                Logger.debug('%d Remain, DeleteBatch Results : %j', batchItems.length, batchResults);
            }
        }
        return rval;
    }

    public async simplePut(tableName: string,value:any): Promise<PutItemOutput> {
        let params:PutItemInput = {
            Item: value,
            ReturnConsumedCapacity: 'TOTAL',
            TableName: tableName
        };

        const res: PromiseResult<PutItemOutput, AWSError> = await this.awsDDB.put(params).promise();
        return res;
    }

    public async simpleGet<T>(tableName: string, keys: any): Promise<T> {
        const params: GetItemInput = {
            TableName: tableName,
            Key: keys
        };

        const holder: PromiseResult<GetItemOutput, AWSError> = await this.awsDDB.get(params).promise();
        return (!!holder && !!holder.Item)?Object.assign({} as T, holder.Item):null
    }

    public async simpleDelete(tableName: string, keys: any): Promise<DeleteItemOutput> {
        const params: DeleteItemInput = {
            TableName: tableName,
            Key: keys
        };

        const holder: PromiseResult<DeleteItemOutput, AWSError> = await this.awsDDB.delete(params).promise();
        return holder;
    }

    public async simpleCount<T>(tableName: string, keys: any): Promise<T> {
        const params: GetItemInput = {
            TableName: tableName,
            Key: keys
        };

        const holder: PromiseResult<GetItemOutput, AWSError> = await this.awsDDB.get(params).promise();
        return (!!holder && !!holder.Item)?Object.assign({} as T, holder.Item):null
    }



}