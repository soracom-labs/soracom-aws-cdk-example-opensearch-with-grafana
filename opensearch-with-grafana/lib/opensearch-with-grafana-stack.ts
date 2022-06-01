import { Stack, StackProps, aws_ec2, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BastionHost } from './bastion';
import { GrafanaCluster } from './grafana';
import { OpensearchCluster } from './opensearch';

export interface OpensearchWithGrafanaStackProps extends StackProps {
  cloudfrontPrefixListId: string;
  ec2KeyPairName: string;
}

export class OpensearchWithGrafanaStack extends Stack {
  constructor(scope: Construct, id: string, props: OpensearchWithGrafanaStackProps) {
    super(scope, id, props);

    const vpc = new aws_ec2.Vpc(this, `${id}/Vpc`, {
      cidr: '10.0.0.0/16',
      maxAzs: 3,
    });

    const grafanaCluster = new GrafanaCluster(this, `${id}/Grafana`, {
      vpc,
      cloudFrontPrefixListId: props.cloudfrontPrefixListId,
    });

    const bastionHost = new BastionHost(this, `${id}/Bastion`, {
      vpc,
      keyPairName: props.ec2KeyPairName,
    });
    new CfnOutput(this, 'Bastion host instance-id', {
      value: bastionHost.checkpointInstanceId,
    });

    const opensearch = new OpensearchCluster(this, `${id}/Opensearch`, {
      vpc,
      peerSecurityGroups: [grafanaCluster.serviceSecurityGroup, bastionHost.bastionHostSecurityGroup],
    });
    new CfnOutput(this,'Lambda function ARN for SORACOM Funk', {
      value: opensearch.lambdaFunctionArn
    });
  }
}
