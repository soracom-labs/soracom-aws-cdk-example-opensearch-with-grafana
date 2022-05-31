import { Client } from '@elastic/elasticsearch';
import dayjs from 'dayjs';

const osDomainEndpoint = `https://${process.env.OS_DOMAIN_ENDPOINT!}`;
const client = new Client({
  node: osDomainEndpoint
});

export class BasicDataRecord {
  imsi: string;
  payload: {[key:string]:string|number};
  tags:{[key:string]:string|number};
  serverTimestamp:string;

  constructor(
      customContext: {[key:string]:string|number},
      payload: {[key:string]:string|number}
  ) {
      this.imsi = customContext.imsi as string;
      this.payload = payload;
      this.serverTimestamp = new Date().toISOString();

  }
}

function buildRecordsToIndex(indexName:string,records:BasicDataRecord[]):any[] {
  return records.flatMap(record => [{index: {_index: indexName }}, record]);
}


export const handler = async (event:any, context:any) : Promise<any> => {

    const record = new BasicDataRecord(
      context.clientContext.custom,
      event,
    );

    const indexName = `SoracomFunk-${dayjs().format('YYYYMMDD')}`;
    const recordsToIndex = buildRecordsToIndex(indexName,[record]);

    //We use bulk api to future update.
    const response:any = await client.bulk({refresh:true,body:recordsToIndex}).catch((error:Error) => {
        console.error(error);
        throw error;
    })

    return  {statusCode: 200, body: JSON.stringify(response.body)};
}