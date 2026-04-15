import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import OpenAI from 'openai';

// GET — returns whether the tenant has an OpenAI API key configured (never the value)
export async function GET(_req: NextRequest) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { openaiApiKey: true, openaiKeySetAt: true },
  });

  return NextResponse.json({
    configured: !!tenant?.openaiApiKey,
    setAt: tenant?.openaiKeySetAt ?? null,
  });
}

// POST — validate, encrypt, and save the OpenAI API key
export async function POST(request: NextRequest) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json() as { apiKey?: string };
  const apiKey = body.apiKey?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
  }

  // Validate the key by making a cheap test call
  const openai = new OpenAI({ apiKey });
  try {
    await openai.models.list();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid API key';
    return NextResponse.json(
      { error: `OpenAI key validation failed: ${message}` },
      { status: 400 }
    );
  }

  const encrypted = encrypt(apiKey);

  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      openaiApiKey: encrypted,
      openaiKeySetAt: new Date(),
    },
  });

  return NextResponse.json({ configured: true, setAt: new Date() });
}

// DELETE — remove the OpenAI API key
export async function DELETE(_req: NextRequest) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      openaiApiKey: null,
      openaiKeySetAt: null,
    },
  });

  return NextResponse.json({ configured: false });
}
