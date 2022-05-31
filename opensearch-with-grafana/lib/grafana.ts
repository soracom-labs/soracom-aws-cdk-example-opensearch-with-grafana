import {
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_ec2,
  aws_ecs,
  aws_ecs_patterns,
  aws_iam,
  aws_rds,
  CfnOutput,
  Duration,
} from 'aws-cdk-lib';
import { CachePolicy } from 'aws-cdk-lib/aws-cloudfront';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface GrafanaClusterProps {
  vpc: Vpc;
  cloudFrontPrefixListId: string;
}

export class GrafanaCluster extends Construct {
  public readonly serviceSecurityGroup: aws_ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: GrafanaClusterProps) {
    super(scope, id);

    //Security Groups
    const albSecurityGroup = new aws_ec2.SecurityGroup(this, 'alb-sg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    albSecurityGroup.addIngressRule(aws_ec2.Peer.prefixList(props.cloudFrontPrefixListId), aws_ec2.Port.tcp(80));

    const serviceSecurityGroup = new aws_ec2.SecurityGroup(this, 'service-sg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    serviceSecurityGroup.addIngressRule(
      aws_ec2.Peer.securityGroupId(albSecurityGroup.securityGroupId),
      aws_ec2.Port.tcp(3000),
    );
    this.serviceSecurityGroup = serviceSecurityGroup;

    const rdsSecurityGroup = new aws_ec2.SecurityGroup(this, 'rds-sg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    rdsSecurityGroup.addIngressRule(
      aws_ec2.Peer.securityGroupId(serviceSecurityGroup.securityGroupId),
      aws_ec2.Port.tcp(3306),
    );

    const rdsPasswordSecret = new secretsmanager.Secret(this, 'rdsSecret', {
      generateSecretString: {
        excludeCharacters: '/@"',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 12,
      },
    });

    //Aurora
    const dbUser = 'admin';
    const rdsCredential = aws_rds.Credentials.fromPassword(dbUser, rdsPasswordSecret.secretValue);
    const aurora = new aws_rds.ServerlessCluster(this, 'aurora', {
      engine: aws_rds.DatabaseClusterEngine.AURORA_MYSQL,
      vpc: props.vpc,
      credentials: rdsCredential,
      securityGroups: [rdsSecurityGroup],
      defaultDatabaseName: 'grafana',
      enableDataApi: true,
    });

    //Grafana cluster
    const cluster = new aws_ecs.Cluster(this, 'Cluster', { vpc: props.vpc });
    const image = aws_ecs.ContainerImage.fromRegistry('grafana/grafana-oss');

    const logging = new aws_ecs.AwsLogDriver({
      streamPrefix: 'grafana',
    });

    const serviceTaskDefinition = new aws_ecs.FargateTaskDefinition(this, 'GrafanaTaskDefinition', {});
    serviceTaskDefinition
      .addContainer('GrafanaContainer', {
        image,
        logging,
        environment: {
          GF_DATABASE_TYPE: 'mysql',
          GF_DATABASE_HOST: aurora.clusterEndpoint.hostname,
          GF_DATABASE_USER: rdsCredential.username,
        },
        secrets: {
          GF_DATABASE_PASSWORD: aws_ecs.Secret.fromSecretsManager(rdsPasswordSecret),
        },
      })
      .addPortMappings({
        containerPort: 3000,
        hostPort: 3000,
      });

    serviceTaskDefinition.taskRole.attachInlinePolicy(
      new aws_iam.Policy(this, 'ecs_task_iam_policy', {
        statements: [
          new aws_iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue', 'kms:Decrypt'],
            resources: ['*'],
          }),
        ],
      }),
    );

    const fargateService = new aws_ecs_patterns.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster,
      taskDefinition: serviceTaskDefinition,
      securityGroups: [serviceSecurityGroup],
    });

    fargateService.targetGroup.configureHealthCheck({
      path: '/api/health',
    });

    fargateService.targetGroup.enableCookieStickiness(Duration.seconds(3600), 'grafana_session');
    fargateService.loadBalancer.addSecurityGroup(albSecurityGroup);

    // CloudFront
    const origin = new aws_cloudfront_origins.LoadBalancerV2Origin(fargateService.loadBalancer, {
      protocolPolicy: aws_cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    const distribution = new aws_cloudfront.Distribution(this, 'cloudfront-distribution', {
      defaultBehavior: {
        cachePolicy: CachePolicy.CACHING_DISABLED,
        origin,
        originRequestPolicy: aws_cloudfront.OriginRequestPolicy.ALL_VIEWER,
        allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new CfnOutput(this, 'GrafanaUrl', {
      value: `https://${distribution.domainName}/`,
    });
  }
}
