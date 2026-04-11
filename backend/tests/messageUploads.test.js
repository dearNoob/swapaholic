const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const BlockedUser = require('../src/models/BlockedUser');
const { connectDB, disconnectDB } = require('../src/config/mongodb');

jest.setTimeout(30000);

const uniqueSuffix = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

describe('Message attachment uploads', () => {
  let senderToken;
  let senderId;
  let recipientId;
  let conversationId;

  const registerUser = async (label) => {
    const suffix = uniqueSuffix();
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: label,
        lastName: 'Attachment',
        phone: `+1555${suffix.slice(-7)}`,
        email: `${label.toLowerCase()}_${suffix}@example.com`,
        password: 'TestPass123',
        role: 'user'
      })
      .expect(201);

    return {
      token: response.body.data.accessToken,
      userId: response.body.data.user.id || response.body.data.user._id
    };
  };

  beforeAll(async () => {
    process.env.FILE_STORAGE_PROVIDER = 'local';
    await connectDB();

    const sender = await registerUser('Sender');
    const recipient = await registerUser('Recipient');

    senderToken = sender.token;
    senderId = sender.userId.toString();
    recipientId = recipient.userId.toString();

    const conversationResponse = await request(app)
      .post('/api/messages/conversations/start')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ recipientId })
      .expect(201);

    conversationId = conversationResponse.body.data.conversationId.toString();
  });

  afterAll(async () => {
    await Message.deleteMany({}).catch(() => {});
    await Conversation.deleteMany({}).catch(() => {});
    await BlockedUser.deleteMany({}).catch(() => {});
    await User.deleteMany({ email: /sender_|recipient_/i }).catch(() => {});

    const messagesDir = path.join(__dirname, '..', 'uploads', 'messages');
    if (fs.existsSync(messagesDir)) {
      fs.rmSync(messagesDir, { recursive: true, force: true });
    }

    await disconnectDB();
    delete process.env.FILE_STORAGE_PROVIDER;
  });

  test('stores message attachments through the shared storage service', async () => {
    const response = await request(app)
      .post(`/api/messages/conversations/${conversationId}/send`)
      .set('Authorization', `Bearer ${senderToken}`)
      .field('content', 'Please see the attached file.')
      .attach('attachments', Buffer.from('sample attachment body'), {
        filename: 'attachment.pdf',
        contentType: 'application/pdf'
      })
      .expect(201);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data.attachments).toHaveLength(1);
    expect(response.body.data.attachments[0].url).toMatch(/^\/uploads\/messages\//);

    const savedFilePath = path.join(
      __dirname,
      '..',
      response.body.data.attachments[0].url.replace(/^\//, '')
    );

    expect(fs.existsSync(savedFilePath)).toBe(true);
  });
});
