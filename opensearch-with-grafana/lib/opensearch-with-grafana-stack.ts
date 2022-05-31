import { Stack, StackProps, aws_ec2, CfnOutput } from 'aws-cdk-lib';
import { BastionHostLinuxProps } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BastionHost, BastionHostProps } from './bastion';
import { GrafanaCluster, GrafanaClusterProps } from './grafana';
import { OpensearchCluster, OpensearchClusterProps } from './opensearch';

export interface OpensearchWithGrafanaStackProps 
extends StackProps {
  cloudfrontPrefixListId: string;
  ec2KeyPairName: string;
}

export class OpensearchWithGrafanaStack extends Stack {
  constructor(scope: Construct, id: string, props: OpensearchWithGrafanaStackProps) {
    super(scope, id, props);

    const vpc = new aws_ec2.Vpc(this, `${id}/Vpc`, {
      cidr: '10.0.0.0/16',
      maxAzs: 3
    });

    const grafanaCluster = new GrafanaCluster(this,`${id}/Grafana`,{
      vpc,
      cloudFrontPrefixListId: props.cloudfrontPrefixListId
    });

    const bastionHost = new BastionHost(this,`${id}/Bastion`,{
      vpc,
      keyPairName:props.ec2KeyPairName
    });
    new CfnOutput(this, "Checkpoint instance-id", {
      value: bastionHost.checkpointInstanceId,
    });

    new OpensearchCluster(this,`${id}/Opensearch`,{
      vpc,
      peerSecurityGroups: [
        grafanaCluster.serviceSecurityGroup,
        bastionHost.bastionHostSecurityGroup
      ]
    });

  }
}