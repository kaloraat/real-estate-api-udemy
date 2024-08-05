import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new SESClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
});

export const sendWelcomeEmail = async (email) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    ReplyToAddresses: [process.env.EMAIL_TO],
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <html>
                <p>Good day! Welcome to ${process.env.APP_NAME} and thank you for joining us.</p>

                <div style="margin:20px auto;">
                    <a href="${process.env.CLIENT_URL}" style="margin-right:50px;">Browse properties</a>
                    <a href="${process.env.CLIENT_URL}/post-ad">Post ad</a>
                </div>

                <i>Team ${process.env.APP_NAME}</i>
            </html>
        `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Welcome to ${process.env.APP_NAME}`,
      },
    },
  };

  const command = new SendEmailCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (err) {
    throw err;
  }
};

export const sendPasswordResetEmail = async (email, code) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    ReplyToAddresses: [process.env.EMAIL_TO],
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <html>
                <p>Good day! Here is your temporary password. Please change it as soon as you login.</p>
                <h2 style="color:red;">${code}</h2>

                <i>Team ${process.env.APP_NAME}</i>
            </html>
        `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Password reset code - ${process.env.APP_NAME}`,
      },
    },
  };

  const command = new SendEmailCommand(params);

  try {
    const data = await client.send(command);
    return data;
  } catch (err) {
    throw err;
  }
};

export const sendContactEmailToAgent = async (ad, user, message) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    ReplyToAddresses: [user.email],
    Destination: {
      ToAddresses: [ad.postedBy.email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <html>
                <p>Good day! ${ad.postedBy.name}</p>
                <p>You have received a new enquiry from ${user.name} from ${process.env.CLIENT_URL}</p>

                <p><strong>Details:</strong></p>

                <ul>
                  <li>Name: ${user.name}</li>
                  <li>Email: <a href="mailto:${user.email}">${user.email}</a></li>
                  <li>Phone: ${user.phone}</li>
                  <li>Enquired ad: <a href="${process.env.CLIENT_URL}/${ad.slug}">${ad.propertyType} for ${ad.action} - ${ad.address} (${ad.price})</a></li>
                </ul>

                <p><strong>Message:</strong></p>
                <p>${message}</p>

                <p>Thank you!</p>
                <i>Team ${process.env.APP_NAME}</i>
            </html>
        `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Enquiry received - ${process.env.APP_NAME}`,
      },
    },
  };

  const command = new SendEmailCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (err) {
    throw err;
  }
};
