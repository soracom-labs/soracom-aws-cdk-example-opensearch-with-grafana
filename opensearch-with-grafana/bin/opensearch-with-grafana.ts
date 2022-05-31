#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OpensearchWithGrafanaStack } from '../lib/opensearch-with-grafana-stack';

const app = new cdk.App();

const cloudfrontPrefixListId = app.node.tryGetContext('cloudFrontPrefixListId');
if (!cloudfrontPrefixListId) {
  throw new Error(
    'You have to provide CloudFront Prefix List Id as cdk deploy -c cloudFrontPrefixListId=CLOUDFRONT_PREFIX_LIST_ID',
  );
}

const ec2KeyPairName = app.node.tryGetContext('ec2KeyPairName');
if (!ec2KeyPairName) {
  throw new Error(
    'You have to provide ec2 key pair name for bastion host as cdk deploy -c ec2KeyPairName=EC2_KEY_PAIR_NAME',
  );
}

new OpensearchWithGrafanaStack(app, 'OpensearchWithGrafanaStack', {
  cloudfrontPrefixListId,
  ec2KeyPairName,
});
