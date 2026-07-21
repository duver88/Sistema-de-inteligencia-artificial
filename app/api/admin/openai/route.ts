import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { OPENAI_KEY_SETTING } from '@/lib/ai/key';
import OpenAI from 'openai';

// GET — returns whether the platform-wide OpenAI API key is configured (never the value)
export async function GET() {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const setting = await prisma.appSetting.findUnique({
    where: { key: OPENAI_KEY_SETTING },
    select: { updatedAt: true },
  });

  return NextResponse.json({
    configured: !!setting,
    setAt: setting?.updatedAt.toISOString() ?? null,
    source: setting ? 'platform' : 'none',
  });
}

// POST — validate, test against OpenAI, encrypt, and save the platform-wide API key
export async function POST(request: NextRequest) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const body = (await request.json().catch(() => null)) as { apiKey?: unknown } | null;
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';

  // Format validation: OpenAI keys start with 'sk-' and have a sane length
  if (!apiKey.startsWith('sk-') || apiKey.length < 20 || apiKey.length > 200) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
  }

  // Prove the key actually works with a cheap call (bounded timeout, no retries)
  const openai = new OpenAI({ apiKey, timeout: 10_000, maxRetries: 1 });
  try {
    await openai.models.list();
  } catch {
    // Never log the key or the raw error (it may echo request headers)
    return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
  }

  const encrypted = encrypt(apiKey);
  const setting = await prisma.appSetting.upsert({
    where: { key: OPENAI_KEY_SETTING },
    create: { key: OPENAI_KEY_SETTING, value: encrypted },
    update: { value: encrypted },
    select: { updatedAt: true },
  });

  return NextResponse.json({
    configured: true,
    setAt: setting.updatedAt.toISOString(),
    source: 'platform',
  });
}

// DELETE — remove the platform-wide OpenAI API key
export async function DELETE() {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  await prisma.appSetting.deleteMany({ where: { key: OPENAI_KEY_SETTING } });

  return NextResponse.json({ configured: false, setAt: null, source: 'none' });
}
