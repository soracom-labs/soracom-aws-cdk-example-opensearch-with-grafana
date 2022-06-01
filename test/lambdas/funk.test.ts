import * as lambda from '../../lambdas/funk';

test('BasicDataRecord created',() =>{
    const record = new lambda.BasicDataRecord(
        { key1: 'value1'},
        { payload1: 'payload1', payload2: 2},
    );
    expect(record).toHaveProperty('imsi');
    expect(record).toHaveProperty('payload');
    expect(record).toHaveProperty('serverTimestamp');
});


test('buildRecordsToIndex',() => {
    const records = [
        new lambda.BasicDataRecord({key:'value'},{payload:'payload'}),
        new lambda.BasicDataRecord({key:'value'},{payload:'payload'})
    ];
    const result = lambda.buildRecordsToIndex('dummyIndexName',records);
    expect(result).toHaveLength(4);
    expect(result[0]).toHaveProperty('index');
    expect(result[1] instanceof lambda.BasicDataRecord).toBeTruthy();

});