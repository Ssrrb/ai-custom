import os
import json
import functions_framework
from google.cloud import pubsub_v1

# Environment variables
PROJECT_ID = os.environ.get("GCLOUD_PROJECT")
TOPIC_ID = os.environ.get("TOPIC_ID")

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)


@functions_framework.cloud_event
def publish_to_pubsub(cloud_event):
    """Triggers from a Cloud Storage event and publishes a message to Pub/Sub."""
    print(f"Received event: {cloud_event.data}")

    # Extract relevant data from the Cloud Storage event
    gcs_data = cloud_event.data
    bucket = gcs_data.get("bucket")
    name = gcs_data.get("name")
    generation = gcs_data.get("generation")
    size = gcs_data.get("size")
    content_type = gcs_data.get("contentType")
    time_created = gcs_data.get("timeCreated")
    event_id = cloud_event.get("id")

    if not all([bucket, name, generation, time_created, event_id]):
        print("Error: Missing essential event data.")
        return 'Missing data', 400

    # Construct the message payload according to the specification
    message_payload = {
        "event_id": event_id,
        "bucket": bucket,
        "object": name,
        "generation": generation,
        "size": int(size) if size else None,
        "contentType": content_type,
        "timeCreated": time_created
    }

    # Publish the message to the Pub/Sub topic
    try:
        future = publisher.publish(
            topic_path, data=json.dumps(message_payload).encode("utf-8"))
        message_id = future.result()
        print(f"Message {message_id} published to {topic_path}.")
        return 'OK', 200
    except Exception as e:
        print(f"Error publishing to Pub/Sub: {e}")
        return 'Error publishing message', 500
