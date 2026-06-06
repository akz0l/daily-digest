import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const SUBSCRIBERS_TABLE = "subscribers";

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? event;
    const email = body?.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response(400, {
        code: "INVALID_EMAIL",
        message: "Email inválido o no proporcionado.",
      });
    }

    const isActive = await isActiveSubscriber(email);

    return response(200, {
      code: "SUBSCRIBER_STATUS",
      email,
      active: isActive,
    });
  } catch (err) {
    console.error("Error en validateActiveSubscriber:", err);
    return response(500, {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor.",
    });
  }
};

async function isActiveSubscriber(email) {
  let lastEvaluatedKey = undefined;

  do {
    const { Items = [], LastEvaluatedKey } = await dynamo.send(
      new ScanCommand({
        TableName: SUBSCRIBERS_TABLE,
        FilterExpression: "email = :email AND active = :active",
        ExpressionAttributeValues: {
          ":email": email,
          ":active": true,
        },
        ProjectionExpression: "id",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (Items.length > 0) return true;

    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return false;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}
