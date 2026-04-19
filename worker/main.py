import json
import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient
from redis import Redis

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/aitaskplatform")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "aitaskplatform")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_QUEUE_NAME = os.getenv("REDIS_QUEUE_NAME", "tasks_queue")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "2"))
POLL_TIMEOUT_SECONDS = int(os.getenv("POLL_TIMEOUT_SECONDS", "5"))


def utc_now() -> datetime:
    return datetime.now(tz=timezone.utc)


def process_text(input_text: str, operation: str):
    if operation == "uppercase":
        return input_text.upper()
    if operation == "lowercase":
        return input_text.lower()
    if operation == "reverse":
        return input_text[::-1]
    if operation == "word_count":
        return len([word for word in input_text.split() if word.strip()])
    raise ValueError(f"Unsupported operation: {operation}")


def append_log(tasks_col, task_id: str, message: str):
    tasks_col.update_one(
        {"_id": parse_object_id(task_id)},
        {"$push": {"logs": {"message": message, "createdAt": utc_now()}}},
    )


def parse_object_id(task_id: str):
    from bson import ObjectId

    return ObjectId(task_id)


def requeue(redis_client: Redis, payload: dict):
    redis_client.lpush(REDIS_QUEUE_NAME, json.dumps(payload))


def handle_payload(redis_client: Redis, tasks_col, raw_payload: str):
    payload = json.loads(raw_payload)
    task_id = payload["taskId"]
    retry_count = int(payload.get("retryCount", 0))

    task = tasks_col.find_one({"_id": parse_object_id(task_id)})
    if not task:
        return

    tasks_col.update_one(
        {"_id": task["_id"]},
        {
            "$set": {"status": "running", "updatedAt": utc_now()},
            "$inc": {"attempts": 1},
            "$push": {"logs": {"message": "Worker picked up task", "createdAt": utc_now()}},
        },
    )

    try:
        result = process_text(task["inputText"], task["operationType"])
        tasks_col.update_one(
            {"_id": task["_id"]},
            {
                "$set": {
                    "status": "success",
                    "result": result,
                    "errorMessage": None,
                    "updatedAt": utc_now(),
                },
                "$push": {
                    "logs": {"message": "Task processed successfully", "createdAt": utc_now()}
                },
            },
        )
    except Exception as exc:
        failure_message = f"Task processing failed: {exc}"
        append_log(tasks_col, task_id, failure_message)

        if retry_count < MAX_RETRIES:
            next_payload = {**payload, "retryCount": retry_count + 1, "lastError": str(exc)}
            append_log(
                tasks_col,
                task_id,
                f"Re-queuing task for retry {retry_count + 1}/{MAX_RETRIES}",
            )
            time.sleep(1)
            requeue(redis_client, next_payload)
            tasks_col.update_one(
                {"_id": task["_id"]},
                {"$set": {"status": "pending", "updatedAt": utc_now()}},
            )
            return

        tasks_col.update_one(
            {"_id": task["_id"]},
            {
                "$set": {"status": "failed", "errorMessage": str(exc), "updatedAt": utc_now()},
                "$push": {
                    "logs": {
                        "message": "Task marked failed after max retries",
                        "createdAt": utc_now(),
                    }
                },
            },
        )


def run_worker():
    mongo_client = MongoClient(MONGO_URI)
    tasks_col = mongo_client[MONGO_DB_NAME]["tasks"]
    redis_client = Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    print("Python worker started")

    while True:
        _, item = redis_client.brpop(REDIS_QUEUE_NAME, timeout=POLL_TIMEOUT_SECONDS) or (None, None)
        if not item:
            continue

        try:
            handle_payload(redis_client, tasks_col, item)
        except Exception as exc:
            print(f"Unhandled worker error: {exc}")


if __name__ == "__main__":
    run_worker()
