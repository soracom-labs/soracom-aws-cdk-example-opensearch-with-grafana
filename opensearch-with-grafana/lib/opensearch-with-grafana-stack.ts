import { Stack, StackProps, aws_ec2 } from 'aws-cdk-lib';
import { BastionHostLinuxProps } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BastionHost, BastionHostProps } from './bastion';
import { GrafanaCluster, GrafanaClusterProps } from './grafana';
import { OpensearchCluster, OpensearchClusterProps } from './opensearch';

export class OpensearchWithGrafanaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const cloudfrontPrefixId = this.node.tryGetContext('CloudFrontPrefixId');
    const rdsMasterPassword  = this.node.tryGetContext('rdsMasterPassword');
    const ec2KeyPairName = this.node.tryGetContext('ec2KeyPairName')

    //VPC
    const vpc = new aws_ec2.Vpc(this, `${id}/Vpc`, {
      cidr: '10.0.0.0/16',
      maxAzs: 3
    });

    //Grafana
    const grafanaProps: GrafanaClusterProps = {
      vpc,
      cloudFrontPrefixListId: cloudfrontPrefixId,
      rdsMasterPassword: rdsMasterPassword
    };
    const grafanaCluster = new GrafanaCluster(this,`${id}/Grafana`,grafanaProps);

    //BastionHost
    const bastionHostProps: BastionHostProps = {
      vpc,
    };
    const bastionHost = new BastionHost(this,`${id}/Bastion`,bastionHostProps);

    //Opensearch
    const opensearchClusterProps: OpensearchClusterProps = {
      vpc,
      peerSecurityGroups: [
        grafanaCluster.serviceSecurityGroup,
        bastionHost.bastionHostSecurityGroup
      ]
    }
    const opensearchCluster = new OpensearchCluster(this,`${id}/Opensearch`,opensearchClusterProps);

  }
}