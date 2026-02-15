from diagrams import Cluster, Diagram, Edge
from diagrams.aws.general import Users
from diagrams.aws.network import (
    InternetGateway,
    NATGateway,
    PrivateSubnet,
    PublicSubnet,
    RouteTable,
    VPC,
    VPCFlowLogs,
    Endpoint,
)
from diagrams.aws.management import Cloudwatch


def build() -> None:
    with Diagram(
        "CHESSCHAT VPC (Python Diagrams)",
        filename="/Users/tim/CODE_PROJECTS/CHESSCHAT_V2/diagrams/output/python_vpc",
        outformat=["png", "svg"],
        show=False,
        direction="TB",
    ):
        users = Users("Internet Users")

        with Cluster("AWS us-east-1"):
            vpc = VPC("chesschat-dev-vpc-main\n10.20.0.0/16")
            igw = InternetGateway("igw-08c762aa9e0f534b1")
            nat = NATGateway("nat-0dee142da7453a5f9")
            flow_logs = VPCFlowLogs("fl-05f30eba368dcc3fd")
            cw_logs = Cloudwatch("/aws/vpc/chesschat-dev-vpc/flow-logs")

            with Cluster("Public Subnets"):
                pub_a = PublicSubnet("us-east-1a\n10.20.0.0/20")
                pub_b = PublicSubnet("us-east-1b\n10.20.16.0/20")
                pub_c = PublicSubnet("us-east-1c\n10.20.32.0/20")

            with Cluster("Private App Subnets"):
                app_a = PrivateSubnet("us-east-1a\n10.20.48.0/20")
                app_b = PrivateSubnet("us-east-1b\n10.20.64.0/20")
                app_c = PrivateSubnet("us-east-1c\n10.20.80.0/20")

            with Cluster("Private Data Subnets"):
                data_a = PrivateSubnet("us-east-1a\n10.20.96.0/20")
                data_b = PrivateSubnet("us-east-1b\n10.20.112.0/20")
                data_c = PrivateSubnet("us-east-1c\n10.20.128.0/20")

            with Cluster("Route Tables"):
                rt_public = RouteTable("public\nrtb-0769e0346dce66198")
                rt_app_a = RouteTable("app-1a\nrtb-05c2a8d8ef55f8e44")
                rt_app_b = RouteTable("app-1b\nrtb-0344e2f09e6880252")
                rt_app_c = RouteTable("app-1c\nrtb-0ee6b3f73ec07e73d")
                rt_data_a = RouteTable("data-1a\nrtb-0ca39cb2160302101")
                rt_data_b = RouteTable("data-1b\nrtb-091d2f66825ec5f4f")
                rt_data_c = RouteTable("data-1c\nrtb-01ba84fa231b06cc2")

            with Cluster("VPC Endpoints"):
                ep_s3 = Endpoint("S3\nvpce-083e6eb89fff2117b")
                ep_ddb = Endpoint("DynamoDB\nvpce-02779bd6e7a7e9be5")
                ep_ecr_api = Endpoint("ECR API\nvpce-0f33be281603357f6")
                ep_ecr_dkr = Endpoint("ECR DKR\nvpce-000b7ae5082191c41")
                ep_logs = Endpoint("CloudWatch Logs\nvpce-0c03bd6affeadc424")
                ep_sm = Endpoint("Secrets Manager\nvpce-0541a547c67809804")

        users >> igw >> pub_a
        vpc >> [pub_a, pub_b, pub_c, app_a, app_b, app_c, data_a, data_b, data_c]

        for subnet in [pub_a, pub_b, pub_c]:
            subnet >> rt_public
        rt_public >> Edge(label="0.0.0.0/0") >> igw

        pub_a >> nat

        app_a >> rt_app_a
        app_b >> rt_app_b
        app_c >> rt_app_c

        data_a >> rt_data_a
        data_b >> rt_data_b
        data_c >> rt_data_c

        [rt_app_a, rt_app_b, rt_app_c] >> Edge(label="0.0.0.0/0") >> nat
        [rt_data_a, rt_data_b, rt_data_c] >> Edge(label="0.0.0.0/0") >> nat

        for subnet in [app_a, app_b, app_c]:
            subnet >> ep_ecr_api
            subnet >> ep_ecr_dkr
            subnet >> ep_logs
            subnet >> ep_sm

        for subnet in [app_a, app_b, app_c, data_a, data_b, data_c]:
            subnet >> ep_s3
            subnet >> ep_ddb

        vpc >> flow_logs >> cw_logs


if __name__ == "__main__":
    build()
