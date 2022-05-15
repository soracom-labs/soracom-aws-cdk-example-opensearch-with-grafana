import { aws_ec2 } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface BastionHostProps {
  vpc: Vpc
}

export class BastionHost extends Construct {

  public readonly bastionHostSecurityGroup: aws_ec2.SecurityGroup;
  
  constructor(scope: Construct, id: string, props: BastionHostProps) {
    super(scope,id);

    const securityGroup = new aws_ec2.SecurityGroup(this,'bastion-sg', {
      vpc:props.vpc,
      allowAllOutbound: true,
    });

    const host = new aws_ec2.BastionHostLinux(this, 'BastionHost', {
      vpc:props.vpc,
      blockDevices: [{
        deviceName: 'EBSBastionHost',
        volume: aws_ec2.BlockDeviceVolume.ebs(10, {
          encrypted: true,
        }),
      }],
      securityGroup
    });

    this.bastionHostSecurityGroup = securityGroup;
  }
}