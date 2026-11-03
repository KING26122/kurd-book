/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/env';

const db = new PrismaClient();
const apiRoot = path.resolve(__dirname, '..');
const demoAssetsDir = path.join(apiRoot, 'prisma', 'demo-assets');
const privateUploadDir = path.resolve(apiRoot, env.UPLOAD_DIR, 'private');

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1800&q=90`;
const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&backgroundColor=1e293b,312e81,064e3b,78350f`;

const USERS = [
  {
    id: 'seed-user-demo',
    email: 'demo@kurdbook.app',
    username: 'demo',
    name: 'ئارین کەریم',
    password: 'Demo1234!',
    city: 'هەولێر',
    bio: 'شاخ و هەور و چای ڕۆژئاوا ☕🌄 — بەخێربێن بۆ کورد بووک',
    verified: true,
    isPro: true,
    role: 'USER',
  },
  {
    id: 'seed-user-zhino',
    email: 'zhino@kurdbook.app',
    username: 'zhino',
    name: 'ژینۆ عەلی',
    password: 'KurdBook1234!',
    city: 'سلێمانی',
    bio: 'وێنەگری سروشت • دیزاینەری گرافیک',
    verified: true,
    isPro: false,
    role: 'USER',
  },
  {
    id: 'seed-user-lawand',
    email: 'lawand@kurdbook.app',
    username: 'lawand',
    name: 'لەوەند ڕەسوڵ',
    password: 'KurdBook1234!',
    city: 'دهۆک',
    bio: 'کۆدنووس • خەونی ئازادی',
    verified: false,
    isPro: true,
    role: 'USER',
  },
  {
    id: 'seed-user-ava',
    email: 'ava@kurdbook.app',
    username: 'ava',
    name: 'ئاوا محەممەد',
    password: 'KurdBook1234!',
    city: 'کەرکوک',
    bio: 'مۆسیقا، پەرتووک و ڕۆشنایی 🌿',
    verified: true,
    isPro: false,
    role: 'USER',
  },
  {
    id: 'seed-user-rojin',
    email: 'rojin@kurdbook.app',
    username: 'rojin',
    name: 'ڕۆژین ئەحمەد',
    password: 'KurdBook1234!',
    city: 'هەڵەبجە',
    bio: 'هونەرمەند • حەز بە ژیانێکی ساکار دەکەم',
    verified: false,
    isPro: false,
    role: 'USER',
  },
  {
    id: 'seed-user-hemin',
    email: 'hemin@kurdbook.app',
    username: 'hemin',
    name: 'هێمن سالار',
    password: 'KurdBook1234!',
    city: 'هەولێر',
    bio: 'پەیوەندییەکان، مرۆڤ و چیرۆکەکان',
    verified: false,
    isPro: false,
    role: 'USER',
  },
  {
    id: 'seed-user-dilan',
    email: 'dilan@kurdbook.app',
    username: 'dilan',
    name: 'دیلان عومەر',
    password: 'KurdBook1234!',
    city: 'سلێمانی',
    bio: 'جووڵە، کامێرا، کوردستان 💚',
    verified: false,
    isPro: false,
    role: 'USER',
  },
  {
    id: 'seed-user-shaho',
    email: 'shaho@kurdbook.app',
    username: 'shaho',
    name: 'شاهۆ بەکر',
    password: 'KurdBook1234!',
    city: 'دهۆک',
    bio: 'قەلەم و ڕەنگ',
    verified: false,
    isPro: false,
    role: 'USER',
  },
] as const;

/**
 * Demo-only X25519 public keys. A real device generates its own identity on first
 * sign-in and publishes it, replacing these values. The private halves are not
 * stored anywhere: seeded keys only let every demo peer start an encrypted chat.
 */
const PUBLIC_KEYS: Record<string, string> = {
  'seed-user-demo': 'OwGy6Z/zRsWPmPNZNll2HnnmGWMUwfrTPqx6QvWlsWM=',
  'seed-user-zhino': 'xiY8gsb9KhcE8en1EwO0Jze7fNPJXcot7rqt7Xup/Hw=',
  'seed-user-lawand': 'XDPVwYkVNB5Rk2v3uTAFRHgGaHP95LsHw/bAHhmHSUM=',
  'seed-user-ava': 'CKONfCzvR3fJ0ZnIt21iygTSn+88szKQ8bAE4uygg3g=',
  'seed-user-rojin': 'WPSsVaEocZ/3KLX5uTyO9k7I2+cHC0pW0CqwfaSLaWo=',
  'seed-user-hemin': 'nKrWLhxyrQOTFUgAomPoPWDtrBm2/32oe7inNPAsdVM=',
  'seed-user-dilan': 'PLrWOcVWIcENWNI/9xP4wjA5zMT4JHy18I18hzOYDUk=',
  'seed-user-shaho': 'H1OrNQTuCtTyCqw0mLTgFKCBdGi6V28U9nmWgvDgdms=',
  'seed-user-admin': 'P5FmOH6S7Gx6NBXVQbOSC7nYkTGoueToByHWS39mUHI=',
};

async function main() {
  if (env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    console.error('Refusing to seed production. Set ALLOW_PROD_SEED=true only for a first demo deployment.');
    process.exit(1);
  }

  console.log('🌱 Seeding Kurd Book demo data…');

  // Ship the demo verification documents with the repository, then copy them into
  // the ignored upload directory so a fresh `npm run setup` produces working previews.
  fs.mkdirSync(privateUploadDir, { recursive: true });
  for (const filename of [
    'seed-id-front.png',
    'seed-id-back.png',
    'seed-selfie.png',
    'seed-pro-receipt.png',
  ]) {
    const source = path.join(demoAssetsDir, filename);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(privateUploadDir, filename));
    } else {
      console.warn(`⚠️  Missing demo asset: ${source}`);
    }
  }

  const passwordHashes = new Map<string, string>();
  for (const password of new Set(USERS.map((u) => u.password))) {
    passwordHashes.set(password, await bcrypt.hash(password, 12));
  }
  const adminHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  await db.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: {
      passwordHash: adminHash,
      role: 'ADMIN',
      name: env.ADMIN_NAME,
      username: env.ADMIN_USERNAME,
      emailVerifiedAt: new Date(),
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      disabled: false,
    },
    create: {
      id: 'seed-user-admin',
      email: env.ADMIN_EMAIL,
      username: env.ADMIN_USERNAME,
      name: env.ADMIN_NAME,
      passwordHash: adminHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      bio: 'بەڕێوەبەرایەتی کورد بووک',
      avatarUrl: avatar('KurdBookAdmin'),
      publicKey: PUBLIC_KEYS['seed-user-admin'],
    },
  });

  for (const user of USERS) {
    const verificationStatus = user.verified ? 'VERIFIED' : user.username === 'rojin' ? 'PENDING' : 'NONE';
    await db.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        username: user.username,
        email: user.email,
        passwordHash: passwordHashes.get(user.password)!,
        city: user.city,
        bio: user.bio,
        emailVerifiedAt: new Date(),
        verificationStatus,
        verifiedAt: user.verified ? new Date() : null,
        isPro: user.isPro,
        proExpiresAt: user.isPro ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        role: user.role,
        disabled: false,
        avatarUrl: avatar(user.username),
        coverUrl: photo('1470770841072-f978cf4d019e'),
        publicKey: PUBLIC_KEYS[user.id],
      },
      create: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        passwordHash: passwordHashes.get(user.password)!,
        city: user.city,
        bio: user.bio,
        emailVerifiedAt: new Date(),
        verificationStatus,
        verifiedAt: user.verified ? new Date() : null,
        isPro: user.isPro,
        proExpiresAt: user.isPro ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        role: user.role,
        avatarUrl: avatar(user.username),
        coverUrl: photo('1470770841072-f978cf4d019e'),
        publicKey: PUBLIC_KEYS[user.id],
        lastActiveAt: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
      },
    });
  }

  const friendships = [
    ['seed-user-demo', 'seed-user-zhino', 'ACCEPTED'],
    ['seed-user-demo', 'seed-user-lawand', 'ACCEPTED'],
    ['seed-user-demo', 'seed-user-ava', 'ACCEPTED'],
    ['seed-user-zhino', 'seed-user-ava', 'ACCEPTED'],
    ['seed-user-lawand', 'seed-user-hemin', 'ACCEPTED'],
    ['seed-user-demo', 'seed-user-dilan', 'ACCEPTED'],
    ['seed-user-rojin', 'seed-user-demo', 'PENDING'],
    ['seed-user-demo', 'seed-user-hemin', 'PENDING'],
    ['seed-user-shaho', 'seed-user-zhino', 'ACCEPTED'],
  ] as const;

  for (const [requesterId, addresseeId, status] of friendships) {
    await db.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId, addresseeId } },
      update: { status },
      create: { requesterId, addresseeId, status },
    });
  }

  const conversations = [
    {
      id: 'seed-conversation-demo-dilan',
      userIds: ['seed-user-demo', 'seed-user-dilan'],
      lastMessageAt: new Date(Date.now() - 18 * 60 * 1000),
    },
    {
      id: 'seed-conversation-demo-zhino',
      userIds: ['seed-user-demo', 'seed-user-zhino'],
      lastMessageAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  ] as const;

  for (const conversation of conversations) {
    await db.conversation.upsert({
      where: { id: conversation.id },
      update: { isGroup: false, title: null },
      create: {
        id: conversation.id,
        isGroup: false,
        lastMessageAt: conversation.lastMessageAt,
      },
    });
    for (const userId of conversation.userIds) {
      await db.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        update: {},
        create: {
          conversationId: conversation.id,
          userId,
          lastReadAt: conversation.lastMessageAt,
        },
      });
    }
  }

  const posts = [
    {
      id: 'seed-post-1',
      authorId: 'seed-user-demo',
      content:
        'ئەم بەیانییە لە قەندیل، هەوا وەک ئاوێنە بوو. هەندێک شت هەن کە کامێرا ناتوانێت بیگرێت — تەنها دڵ دەیزانێت. 🌄\n\n#کوردستان #سروشت #بەیانی',
      media: [{ url: photo('1464822759023-fed622ff2c3b'), type: 'image' }],
      visibility: 'PUBLIC',
      likeCount: 128,
      commentCount: 2,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'seed-post-2',
      authorId: 'seed-user-zhino',
      content:
        'ڕەنگی پاییز لە کوردستان دەنگی هەیە. وێنەکانم لە دەشتی هەولێر گرتوون — کامەیان زیاتر حەز پێدەکەن؟ 🍂📷',
      media: [
        { url: photo('1470770841072-f978cf4d019e'), type: 'image' },
        { url: photo('1501785888041-af3ef285b470'), type: 'image' },
      ],
      visibility: 'PUBLIC',
      likeCount: 214,
      commentCount: 1,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      id: 'seed-post-3',
      authorId: 'seed-user-lawand',
      content:
        'ئێوارەیەک لەگەڵ هاوڕێیان، چایێکی گەرم و گفتوگۆی بێکۆتایی. ژیان لەم ساتە بچووکانەدا ڕازاوەتەوە. ☕🤍',
      media: [],
      visibility: 'PUBLIC',
      likeCount: 76,
      commentCount: 0,
      createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
    },
    {
      id: 'seed-post-4',
      authorId: 'seed-user-ava',
      content:
        'پەرتووکێک کە دەبێت هەمووان بیخوێننەوە: «دەنگی کوردستان» — مێژوویەک لە نێوان چیاکاندا. ئێوە ئێستا چ پەرتووکێک دەخوێننەوە؟ 📚',
      media: [],
      visibility: 'PUBLIC',
      likeCount: 59,
      commentCount: 1,
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
    {
      id: 'seed-post-5',
      authorId: 'seed-user-demo',
      content: 'شەوێکی ئارام بۆ هەموو دڵەکان. 🌙',
      media: [],
      visibility: 'FRIENDS',
      likeCount: 33,
      commentCount: 0,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    },
    {
      id: 'seed-post-6',
      authorId: 'seed-user-shaho',
      content:
        'قەڵای هەولێر لە کاتی ڕۆژئاوابوون. هەموو جارێک کە دەگەڕێمەوە، وەک یەکەم جار سەرسام دەبم. 🏰',
      media: [{ url: photo('1519681393784-d120267933ba'), type: 'image' }],
      visibility: 'PUBLIC',
      likeCount: 97,
      commentCount: 0,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
  ];

  for (const post of posts) {
    await db.post.upsert({
      where: { id: post.id },
      update: {
        content: post.content,
        media: JSON.stringify(post.media),
        visibility: post.visibility,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
      },
      create: {
        id: post.id,
        authorId: post.authorId,
        content: post.content,
        media: JSON.stringify(post.media),
        visibility: post.visibility,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        createdAt: post.createdAt,
      },
    });
  }

  const comments = [
    {
      id: 'seed-comment-1',
      postId: 'seed-post-1',
      userId: 'seed-user-zhino',
      content: 'واقعاً سەرسوڕهێنەرە ئارین! 🌄',
    },
    {
      id: 'seed-comment-2',
      postId: 'seed-post-1',
      userId: 'seed-user-lawand',
      content: 'قەندیل هەموو جارێک جیاوازە.',
    },
    {
      id: 'seed-comment-3',
      postId: 'seed-post-2',
      userId: 'seed-user-demo',
      content: 'هەردووکیان جوانن، بەڵام یەکەمیان دڵم ڕفاند. 🍂',
    },
    {
      id: 'seed-comment-4',
      postId: 'seed-post-4',
      userId: 'seed-user-ava',
      content: '«مێژووی سروشتی کوردستان» — پێشنیاری دەکەم.',
    },
  ];
  for (const comment of comments) {
    await db.comment.upsert({
      where: { id: comment.id },
      update: { content: comment.content },
      create: comment,
    });
  }

  const likedPosts = ['seed-post-1', 'seed-post-2', 'seed-post-3'];
  for (const postId of likedPosts) {
    await db.postLike.upsert({
      where: { postId_userId: { postId, userId: 'seed-user-demo' } },
      update: {},
      create: { postId, userId: 'seed-user-demo' },
    });
  }

  const stories = [
    {
      id: 'seed-story-1',
      authorId: 'seed-user-zhino',
      mediaUrl: photo('1464822759023-fed622ff2c3b'),
      mediaType: 'image',
      caption: 'بەیانی باش، کوردستان ☀️',
      offsetHours: 1,
    },
    {
      id: 'seed-story-2',
      authorId: 'seed-user-lawand',
      mediaUrl: photo('1501785888041-af3ef285b470'),
      mediaType: 'image',
      caption: 'ڕێگای شاخەکان',
      offsetHours: 3,
    },
    {
      id: 'seed-story-3',
      authorId: 'seed-user-ava',
      mediaUrl: photo('1470770841072-f978cf4d019e'),
      mediaType: 'image',
      caption: 'ئەمڕۆ لەگەڵ سروشت',
      offsetHours: 5,
    },
    {
      id: 'seed-story-4',
      authorId: 'seed-user-demo',
      mediaUrl: photo('1523712999610-f77fbcfc3843'),
      mediaType: 'image',
      caption: 'کەمێک ئارامی بۆ دڵ',
      offsetHours: 7,
    },
  ];
  for (const story of stories) {
    await db.story.upsert({
      where: { id: story.id },
      update: {},
      create: {
        id: story.id,
        authorId: story.authorId,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        createdAt: new Date(Date.now() - story.offsetHours * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  await db.verificationRequest.upsert({
    where: { id: 'seed-verification-1' },
    update: {
      status: 'PENDING',
      frontUrl: '/api/uploads/private/seed-id-front.png',
      backUrl: '/api/uploads/private/seed-id-back.png',
      selfieUrl: '/api/uploads/private/seed-selfie.png',
    },
    create: {
      id: 'seed-verification-1',
      userId: 'seed-user-rojin',
      frontUrl: '/api/uploads/private/seed-id-front.png',
      backUrl: '/api/uploads/private/seed-id-back.png',
      selfieUrl: '/api/uploads/private/seed-selfie.png',
      status: 'PENDING',
    },
  });
  await db.user.update({
    where: { id: 'seed-user-rojin' },
    data: { verificationStatus: 'PENDING' },
  });

  await db.proRequest.upsert({
    where: { id: 'seed-pro-request-1' },
    update: {
      status: 'PENDING',
      receiptUrl: '/api/uploads/private/seed-pro-receipt.png',
    },
    create: {
      id: 'seed-pro-request-1',
      userId: 'seed-user-hemin',
      plan: 'YEARLY',
      provider: 'FASTPAY',
      amount: 45000,
      status: 'PENDING',
      receiptUrl: '/api/uploads/private/seed-pro-receipt.png',
      reference: 'FP-2026-00918452',
      note: 'حەز دەکەم Pro ببم بۆ لایڤکردن.',
    },
  });
  await db.payment.upsert({
    where: { proRequestId: 'seed-pro-request-1' },
    update: { status: 'PAID', paidAt: new Date() },
    create: {
      id: 'seed-payment-1',
      userId: 'seed-user-hemin',
      proRequestId: 'seed-pro-request-1',
      provider: 'FASTPAY',
      providerRef: 'FP-2026-00918452',
      plan: 'YEARLY',
      amount: 45000,
      status: 'PAID',
      raw: JSON.stringify({ demo: true, receipt: 'seed-pro-receipt.png' }),
      paidAt: new Date(),
    },
  });

  await db.report.upsert({
    where: { id: 'seed-report-1' },
    update: { status: 'OPEN' },
    create: {
      id: 'seed-report-1',
      reporterId: 'seed-user-demo',
      targetType: 'USER',
      targetId: 'seed-user-shaho',
      reason: 'هەڵسوکەوتی نەشیاو لە کۆمێنتەکان',
      details: 'چەند جارێک کۆمێنتی نەشیاو نووسیوە. تکایە پشکنین بکەن.',
      evidence: JSON.stringify([]),
      status: 'OPEN',
    },
  });

  const admin = await db.user.findUnique({ where: { email: env.ADMIN_EMAIL } });

  const notifications = [
    {
      id: 'seed-notif-1',
      userId: 'seed-user-demo',
      type: 'FRIEND_REQUEST',
      title: 'داواکاری هاوڕێیەتی',
      body: 'ڕۆژین ئەحمەد داوای هاوڕێیەتی کرد.',
      data: JSON.stringify({ username: 'rojin' }),
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      id: 'seed-notif-2',
      userId: 'seed-user-demo',
      type: 'LIKE',
      title: 'دڵی نوێ ❤️',
      body: 'ژینۆ عەلی دڵی پۆستەکەی دا.',
      data: JSON.stringify({ username: 'zhino', postId: 'seed-post-1' }),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'seed-notif-3',
      userId: 'seed-user-demo',
      type: 'PRO',
      title: 'بەخێربێیت بۆ Pro 👑💎',
      body: 'تاج و ئەڵماس لە تەنیشت ناوەکەت دەردەکەوێت. سوپاس!',
      data: JSON.stringify({ plan: 'MONTHLY' }),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];
  for (const notification of notifications) {
    await db.notification.upsert({
      where: { id: notification.id },
      update: {},
      create: notification,
    });
  }

  if (admin) {
    const adminNotifications = [
      {
        type: 'VERIFICATION',
        title: 'داواکاری پشتڕاستکردنەوەی نوێ',
        body: 'ڕۆژین ئەحمەد داواکاری پشتڕاستکردنەوەی ناردووە.',
        data: { username: 'rojin' },
      },
      {
        type: 'PRO',
        title: 'داواکاری Pro — پێداچوونەوە پێویستە',
        body: 'هێمن سالار داواکاری Pro بە FastPay کرد.',
        data: { plan: 'YEARLY' },
      },
      {
        type: 'REPORT',
        title: 'ڕاپۆرتی نوێ',
        body: 'ئارین کەریم هەڵسوکەوتی نەشیاو ڕاپۆرت کرد.',
        data: { username: 'shaho' },
      },
    ] as const;

    for (const [index, item] of adminNotifications.entries()) {
      await db.notification.upsert({
        where: { id: `seed-admin-notif-${index + 1}` },
        update: {},
        create: {
          id: `seed-admin-notif-${index + 1}`,
          userId: admin.id,
          type: item.type,
          title: item.title,
          body: item.body,
          data: JSON.stringify(item.data),
          createdAt: new Date(Date.now() - (index + 1) * 45 * 60 * 1000),
        },
      });
    }
  }

  // 14 days of activity for the dashboard chart.
  const allUsers = await db.user.findMany({ select: { id: true } });
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - dayOffset);
    const day = date.toISOString().slice(0, 10);
    const activeCount = 2 + ((dayOffset * 3 + 4) % Math.max(3, allUsers.length));
    for (let index = 0; index < Math.min(activeCount, allUsers.length); index++) {
      const user = allUsers[index];
      if (!user) continue;
      await db.activityDay.upsert({
        where: { userId_day: { userId: user.id, day } },
        update: {},
        create: { userId: user.id, day },
      });
    }
  }

  console.log('\n✅ Seed complete.');
  console.log('   Admin :', env.ADMIN_EMAIL, '/', env.ADMIN_PASSWORD);
  console.log('   Demo  : demo@kurdbook.app / Demo1234!');
  console.log('   Users : zhino@kurdbook.app, lawand@kurdbook.app, ava@kurdbook.app … / KurdBook1234!');
  console.log(`\n   Admin dashboard: http://localhost:5174  →  ${env.ADMIN_EMAIL}`);
  console.log('   Demo user app  : http://localhost:5173  →  demo@kurdbook.app\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
