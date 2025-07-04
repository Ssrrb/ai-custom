import os
import json
import logging
from concurrent.futures import TimeoutError
from google.cloud import pubsub_v1, storage
from google.api_core import exceptions as google_exceptions

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# --- Configuration ---
# Get from environment variables set in docker-compose.yml
PROJECT_ID = os.environ.get("GCLOUD_PROJECT")
SUBSCRIPTION_ID = os.environ.get("SUBSCRIPTION_ID")
DOWNLOAD_PATH = "/manejo-documentos/files"

# --- Google Cloud Clients ---
subscriber = pubsub_v1.SubscriberClient()
storage_client = storage.Client()
subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_ID)


def process_file(bucket_name, object_name):
    """
    Downloads a file from GCS to the local filesystem.
    Raises google.api_core.exceptions.NotFound if the file does not exist.
    """
    logging.info(f"Attempting to download gs://{bucket_name}/{object_name}")

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_name)

    # Construct destination path including the user's email as a directory
    destination_dir = os.path.join(DOWNLOAD_PATH, os.path.dirname(object_name))
    # Ensure the user's directory exists
    os.makedirs(destination_dir, exist_ok=True)

    destination_file_name = os.path.join(
        destination_dir, os.path.basename(object_name))

    blob.download_to_filename(destination_file_name)
    logging.info(f"Successfully downloaded to {destination_file_name}")


def message_callback(message: pubsub_v1.subscriber.message.Message) -> None:
    """Callback function executed for each received Pub/Sub message."""
    logging.info(
        f"Received message: {message.message_id}, data: {message.data.decode('utf-8')}")

    try:
        data = json.loads(message.data.decode("utf-8"))
        bucket = data.get("bucket")
        object_name = data.get("object")

        if not bucket or not object_name:
            logging.error("Message is missing 'bucket' or 'object' fields.")
            message.ack()  # Acknowledge to avoid redelivery
            return

        # --- Business Logic: Download and Process ---
        process_file(bucket, object_name)
        logging.info(
            f"Successfully processed message {message.message_id}. Acknowledging.")
        message.ack()  # Acknowledge after successful processing

    except google_exceptions.NotFound as e:
        logging.error(
            f"File not found for message {message.message_id}: {e}. Acknowledging to prevent redelivery loop.")
        message.ack()  # It's a 404, don't retry.
    except json.JSONDecodeError as e:
        logging.error(f"Could not decode message data: {e}")
        message.ack()  # Acknowledge malformed messages to avoid redelivery loops
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        message.nack()  # Nack for other errors to allow for retries


def main():
    """Starts the Pub/Sub subscriber to listen for messages."""
    # The subscriber is non-blocking and will be kept alive by the main thread.
    streaming_pull_future = subscriber.subscribe(
        subscription_path, callback=message_callback)
    logging.info(f"Listening for messages on {subscription_path}...")

    # Wrap the future in a try/except block to catch exceptions
    try:
        # When timeout is not set, the future will block indefinitely.
        streaming_pull_future.result()
    except TimeoutError:
        streaming_pull_future.cancel()
        streaming_pull_future.result()  # Block until the cancellation is complete
    except Exception as e:
        logging.error(f"An error occurred during subscription: {e}")
        streaming_pull_future.cancel()


if __name__ == "__main__":
    if not PROJECT_ID or not SUBSCRIPTION_ID:
        raise EnvironmentError(
            "GCLOUD_PROJECT and SUBSCRIPTION_ID must be set.")
    main()
