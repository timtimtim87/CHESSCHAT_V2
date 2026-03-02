import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { config } from "../config.js";
import { log } from "../utils/logger.js";

const client = new CloudWatchClient({ region: config.awsRegion });
const namespace = config.app.metricsNamespace;

async function publishMetric(metricName, value = 1, dimensions = []) {
  try {
    await client.send(
      new PutMetricDataCommand({
        Namespace: namespace,
        MetricData: [
          {
            MetricName: metricName,
            Timestamp: new Date(),
            Unit: "Count",
            Value: value,
            Dimensions: dimensions
          }
        ]
      })
    );
  } catch (error) {
    log("warn", "metric_publish_failed", {
      metricName,
      error: error.message
    });
  }
}

export async function emitWsConnectionOpened() {
  await publishMetric("WsConnectionsOpened");
}

export async function emitWsConnectionClosed() {
  await publishMetric("WsConnectionsClosed");
}

export async function emitGameStarted() {
  await publishMetric("GamesStarted");
}

export async function emitGameEnded() {
  await publishMetric("GamesEnded");
}

export async function emitAppError() {
  await publishMetric("AppErrors");
}
