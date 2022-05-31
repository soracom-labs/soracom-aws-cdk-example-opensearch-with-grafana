import { aws_ec2, aws_iam, CfnOutput } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface BastionHostProps {
  vpc: Vpc;
  keyPairName: string;
}

export class BastionHost extends Construct {
  public readonly checkpointInstanceId: string;
  public readonly bastionHostSecurityGroup: aws_ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: BastionHostProps) {
    super(scope, id);

    const securityGroup = new aws_ec2.SecurityGroup(this, 'bastion-sg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    const role = new aws_iam.Role(this, 'ec2Role', {
      assumedBy: new aws_iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    role.addManagedPolicy(aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    // Use Latest Amazon Linux Image - CPU Type ARM64
    const ami = new aws_ec2.AmazonLinuxImage({
      generation: aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: aws_ec2.AmazonLinuxCpuType.ARM_64,
    });

    const checkpointInstance = new aws_ec2.Instance(this, 'checkpoint', {
      vpc: props.vpc,
      instanceType: aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T4G, aws_ec2.InstanceSize.MICRO),
      machineImage: ami,
      securityGroup,
      role,
      keyName: props.keyPairName,
    });

    this.checkpointInstanceId = checkpointInstance.instanceId;
    this.bastionHostSecurityGroup = securityGroup;
  }
}
