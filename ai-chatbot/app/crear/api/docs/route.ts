import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDevelopmentEnvironment } from '@/lib/constants';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'node:stream';

// Initialize Google Cloud Storage.
// This will use Application Default Credentials (ADC).
// For local development, set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
// In a GCP environment, it will automatically use the container's service account.
const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME environment variable is not set.');
}

const bucket = storage.bucket(bucketName);

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: !isDevelopmentEnvironment,
    });

    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('file') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
    }

    const userName = token.email.replace(/\s+/g, '_').toLowerCase();
    const uploadPromises = files.map(async file => {
      const fileName = `${userName}/${Date.now()}-${file.name}`;
      const gcsFile = bucket.file(fileName);

      // Convert ArrayBuffer to a readable stream
      const buffer = await file.arrayBuffer();
      const readableStream = new Readable();
      readableStream.push(Buffer.from(buffer));
      readableStream.push(null); // Signal the end of the stream

      await new Promise((resolve, reject) => {
        const writeStream = gcsFile.createWriteStream({
          resumable: false,
          contentType: file.type,
          metadata: {
            // Add the user's email as custom metadata, as per GCP best practices
            metadata: {
              userEmail: token.email as string,
            },
          },
        });

        readableStream
          .pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      return `https://storage.googleapis.com/${bucketName}/${fileName}`;
    });

    const urls = await Promise.all(uploadPromises);

    return NextResponse.json(
      { message: 'Files uploaded successfully.', urls },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to upload file.', details: errorMessage },
      { status: 500 },
    );
  }
  
}
