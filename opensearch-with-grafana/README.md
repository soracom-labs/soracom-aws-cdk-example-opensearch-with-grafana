# Opensearch with Grafana 

An example AWS CDK stack to visualize data from your IoT devices. Mainly consists of:
- AWS Lambda function: an entry point for SORACOM Funk to ingest data.
- Amazon OpensSarch Service cluster: Data store
- Grafana on Amazon ECS Fargate cluster: Dashboard

## 1. Deploy

```bash
# Install dependencies
npm install

# Build
npm run build

# Deploy
# For the fist deploy, it takes about 20-30mins to create Amazon OpenSearch Service cluster.
npx cdk deploy -c cloudFrontPrefixListId=CLOUDFRONT_PREFIX_LIST_ID -c ec2KeyPairName=EC2_KEY_PAIR_NAME
```

Where: 
- CLOUDFRONT_PREFIX_LIST_ID: Managed Prefix List ID for CloudFront origin access
- EC2_KEY_PAIR_NAME: Your EC2 key pair name for bastion host.

Then you will get outputs as 

 ```
Outputs:
OpensearchWithGrafanaStack.Bastionhostinstanceid = i-0dac6...
OpensearchWithGrafanaStack.LambdafunctionARNforSORACOMFunk = arn:aws:lambda:ap-northeast-1:903921708000:function:Opensea...
OpensearchWithGrafanaStack.OpensearchWithGrafanaStackGrafanaFargateServiceLoadBalancerDNS29DA5CEF = Opens-Opens-16LQRTWP...
OpensearchWithGrafanaStack.OpensearchWithGrafanaStackGrafanaFargateServiceServiceURL2705B18E = http://Opens-Opens-16LQRTWP0...
OpensearchWithGrafanaStack.OpensearchWithGrafanaStackGrafanaGrafanaUrl46AD0722 = https://d1g1sw...
OpensearchWithGrafanaStack.OpensearchWithGrafanaStackOpensearchOpensearchUrlB6DC540C = https://vpc-opens...
Stack ARN:
arn:aws:cloudformation:ap-northeast-1:903921708000:stack/OpensearchWithGrafanaStack/dd698...
 ```

For further part, we will refer as
- ${LAMBDA_FUNCTION_ARN} = OpensearchWithGrafanaStack.LambdafunctionARNforSORACOMFunk
- ${GRAFANA_URL} = OpensearchWithGrafanaStack.OpensearchWithGrafanaStackGrafanaGrafanaUrl...
- ${OPENSEARCH_URL} = OpensearchWithGrafanaStack.OpensearchWithGrafanaStackOpensearchOpensearchUrl...
- ${BASTION_HOST_INSTANCE_ID} = OpensearchWithGrafanaStack.Bastionhostinstanceid

Now we have deployed Amazon OpenSearch Service, grafana on Amazon ECS Fargate and AWS Lambda for data ingestion.

## 2. Configure SORACOM Funk

Let's configrue SORACOM Funk so it sends data to OpenSearch cluster via Lambda function. [SORACOM Funk](https://developers.soracom.io/en/docs/funk/) is an entry point to invoke cloud functions upon incoming data from your devices. 

When your devices send telemetries to `http://funk.soracom.io`, SORACOM Funk authenticate and authorize them using subscriber data, then it invokes cloud functions like AWS Lambda with using telemetries as arguments. Oh, is this `http://`? Yes, the network among your devices and `funk.soracom.io` is an isolated and protected so you don't have to pay encryption overhead. Of course it forwards your data to cloud functions with encrypted! 

To use SORACOM Funk, you have to:
1. Create AWS IAM Role or AWS IAM User to invoke the Lambda function.
2. Put the above credential to your SORACOM account.
3. Configure SORACOM Funk so it refers to the Lambda function we have just deployed.

For detailed steps, please refer to [Configuration part](https://developers.soracom.io/en/docs/funk/configuration/) on the SORACOM website. You can use ${LAMBDA_FUNCTION_ARN} as your Lambda function resource id.

[This Lambda function](./lambdas/funk.ts) expects incoming events in JSON formatted, so please be sure that your devices send telemetires in JSON.


## 3. Configure grafana

To start using grafana, you have to configure data source so it refers to OpenSearch as:

1. Configure grafana admin user
    - When you access to ${GRAFANA_URL}, you will be prompted to change initial password.
1. Configure OpenSearch as grafana data source.
    -  You have to configure data source to piont your OpenSearch cluster as navigating `Configuration` -> `Data sources` and click `Add data source`, then fill fields as below.
        - URL: `${OPENSEARCH_URL}`
        - Index Name: `[soracomfunk-]YYYYMMDD`
        - Pattern: `Daily`
        - Time field name: `serverTimestamp`
        - Elasticsearch Version: `7.0+`

OK, now you can start using your grafana!

## (Optional) Customizing grafana

grafana is highly flexible and extensible software, you can configure it [via environment variables](https://grafana.com/docs/grafana/latest/administration/configuration/#override-configuration-with-environment-variables). You can update environment variables for grafana by editing [lib/grafana.ts](./lib/grafana.ts#86).

## (Optional) Maintaining OpenSearch cluster

Opensearch provides Opensearch Dashboards. This CDK stack allows you to improve the performance and efficiency of Opensearch by specifying Index templates. You can also delete indexes (data) once they have been submitted.

You can access to OpenSearch Dashboards as:

1. Configure Amazon Cognito User Pool for OpenSearch Dashboards access
1. Establish SSH tunnel to access OpenSearch inside the VPC

For detial, please refer to [How can I use an SSH tunnel to access OpenSearch Dashboards from outside of a VPC with Amazon Cognito authentication?](https://aws.amazon.com/premiumsupport/knowledge-center/opensearch-outside-vpc-ssh/).

For SSH tunnel, you can use a bastion host deployed in the stack as

```
ssh -i ${PATH/TO/EC2_KEY_PAIR} -ND 8157 ec2-user@${BASTION_HOST_INSTANCE_ID}
```


## TODO

- [ ] Configure Grafana datas ource from CDK.
- [ ] Make Managed Prefix List Id as CDK custom resource.