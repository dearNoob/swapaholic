const fs = require('fs');
const path = require('path');

describe('storageService', () => {
  const uploadsRoot = path.join(__dirname, '..', 'uploads');

  afterEach(() => {
    jest.resetModules();
    delete process.env.FILE_STORAGE_PROVIDER;
  });

  afterAll(() => {
    if (fs.existsSync(uploadsRoot)) {
      fs.rmSync(uploadsRoot, { recursive: true, force: true });
    }
  });

  test('stores files locally and returns a public uploads path by default', async () => {
    process.env.FILE_STORAGE_PROVIDER = 'local';
    const storageService = require('../src/services/storageService');

    const uploadedPath = await storageService.uploadSingleFile(
      {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-image-bytes')
      },
      {
        folder: 'products',
        resourceType: 'image'
      }
    );

    expect(uploadedPath).toMatch(/^\/uploads\/products\//);

    const absolutePath = path.join(__dirname, '..', uploadedPath.replace(/^\//, ''));
    expect(fs.existsSync(absolutePath)).toBe(true);
  });
});
