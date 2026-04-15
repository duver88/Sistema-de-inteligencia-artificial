/**
 * Seed script for SocialPulse development environment.
 * Creates a demo tenant (Urbamares) with projects, knowledge entries, and sample comment logs.
 *
 * Run with: npx tsx prisma/seed.ts
 */
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? '' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Demo projects for a Colombian real-estate developer
const DEMO_PROJECTS = [
  {
    name: 'Diamante Campestre',
    detectionKeywords: ['diamante', 'campestre', 'diamante campestre'],
    knowledge: [
      { key: 'Precio desde', value: '$180,000,000 COP', category: 'pricing' },
      { key: 'Área', value: '45 a 65 m²', category: 'features' },
      { key: 'Ubicación', value: 'Km 3 vía Girardot, Cundinamarca', category: 'location' },
      { key: 'Entrega', value: 'Diciembre 2025', category: 'features' },
      { key: 'WhatsApp ventas', value: '+57 310 555 0001', category: 'contact' },
    ],
  },
  {
    name: 'Torres del Río',
    detectionKeywords: ['torres del río', 'torres del rio', 'torres rio'],
    knowledge: [
      { key: 'Precio desde', value: '$220,000,000 COP', category: 'pricing' },
      { key: 'Área', value: '55 a 80 m²', category: 'features' },
      { key: 'Ubicación', value: 'Carrera 15 #82-45, Bogotá', category: 'location' },
      { key: 'Parqueadero', value: 'Incluido en el precio', category: 'features' },
      { key: 'WhatsApp ventas', value: '+57 310 555 0002', category: 'contact' },
    ],
  },
  {
    name: 'Reserva del Bosque',
    detectionKeywords: ['reserva del bosque', 'reserva bosque'],
    knowledge: [
      { key: 'Precio desde', value: '$350,000,000 COP', category: 'pricing' },
      { key: 'Área', value: '80 a 120 m²', category: 'features' },
      { key: 'Ubicación', value: 'Chía, Cundinamarca', category: 'location' },
      { key: 'Cuotas', value: 'Hasta 120 meses con Banco Davivienda', category: 'financing' },
      { key: 'WhatsApp ventas', value: '+57 310 555 0003', category: 'contact' },
    ],
  },
  {
    name: 'Mirador de la Sabana',
    detectionKeywords: ['mirador de la sabana', 'mirador sabana'],
    knowledge: [
      { key: 'Precio desde', value: '$280,000,000 COP', category: 'pricing' },
      { key: 'Área', value: '60 a 90 m²', category: 'features' },
      { key: 'Ubicación', value: 'Mosquera, Cundinamarca', category: 'location' },
      { key: 'Subsidio', value: 'Aplica para subsidio Mi Casa Ya', category: 'financing' },
      { key: 'WhatsApp ventas', value: '+57 310 555 0004', category: 'contact' },
    ],
  },
  {
    name: 'Villas del Sol',
    detectionKeywords: ['villas del sol', 'villas sol'],
    knowledge: [
      { key: 'Precio desde', value: '$160,000,000 COP', category: 'pricing' },
      { key: 'Área', value: '40 a 55 m²', category: 'features' },
      { key: 'Ubicación', value: 'Soacha, Cundinamarca', category: 'location' },
      { key: 'Sala de ventas', value: 'Lunes a sábado 8am–6pm', category: 'contact' },
      { key: 'WhatsApp ventas', value: '+57 310 555 0005', category: 'contact' },
    ],
  },
];

const GLOBAL_KNOWLEDGE = [
  { key: 'Empresa', value: 'Urbamares SAS — constructora con 15 años de experiencia en Colombia', category: 'general' },
  { key: 'Atención al cliente', value: 'info@urbamares.com.co | +57 601 200 3000', category: 'contact' },
  { key: 'Financiación', value: 'Trabajamos con todos los bancos del sistema financiero colombiano', category: 'financing' },
  { key: 'Garantía', value: '10 años de garantía estructural según norma NSR-10', category: 'general' },
];

const SAMPLE_COMMENT_ACTIONS = [
  'REPLIED', 'REPLIED', 'REPLIED', 'IGNORED', 'DELETED', 'HIDDEN',
  'MANUAL_REPLY', 'ERROR', 'REPLIED', 'IGNORED',
];

const SAMPLE_COMMENTS = [
  { text: '¿Cuál es el precio del apartamento más pequeño?', author: 'Carlos Martínez', reply: 'Hola Carlos, el precio inicial es desde $180,000,000 COP. ¡Escríbenos al WhatsApp para más detalles!' },
  { text: '¿Tienen apartamentos con parqueadero incluido?', author: 'Diana Gómez', reply: 'Hola Diana, en Torres del Río el parqueadero está incluido en el precio. ¿Te gustaría agendar una visita?' },
  { text: 'Me interesa, ¿cómo aplico a financiación?', author: 'Pedro Hernández', reply: 'Hola Pedro, trabajamos con todos los bancos del sistema financiero. Te contactamos en breve.' },
  { text: '¿Aplica para subsidio Mi Casa Ya?', author: 'Luisa Vargas', reply: 'Sí Luisa, Mirador de la Sabana aplica para Mi Casa Ya. Escríbenos para guiarte en el proceso.' },
  { text: 'muy caro para lo que ofrecen', author: 'Roberto Castro', reply: null },
  { text: 'sígueme de vuelta @usuario sorteo gratis', author: 'Spam Bot 123', reply: null },
  { text: '¿En qué ciudad están los apartamentos?', author: 'Valentina Ríos', reply: 'Hola Valentina, tenemos proyectos en Cundinamarca: Chía, Mosquera, Soacha y Bogotá. ¿Cuál zona te interesa más?' },
  { text: '¿Cuándo es la entrega del proyecto?', author: 'Andrés Morales', reply: null },
  { text: 'Excelente proyecto, los felicito', author: 'María Jiménez', reply: null },
  { text: '¿Tienen sala de ventas abierta el domingo?', author: 'Jorge Quintero', reply: 'Hola Jorge, nuestra sala de ventas en Villas del Sol atiende de lunes a sábado 8am–6pm. ¡Te esperamos!' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant-urbamares' },
    update: {},
    create: {
      id: 'demo-tenant-urbamares',
      name: 'Urbamares SAS',
      plan: 'PROFESSIONAL',
    },
  });
  console.log(`✅ Tenant: ${tenant.name}`);

  // Create demo social account (fake — no real Meta connection)
  const account = await prisma.socialAccount.upsert({
    where: { platform_pageId: { platform: 'FACEBOOK', pageId: 'demo-page-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      platform: 'FACEBOOK',
      pageId: 'demo-page-001',
      pageName: 'Urbamares Oficial',
      pageToken: 'demo:000000000000000000000000:000000000000000000000000:demo-token-placeholder',
      isActive: true,
      webhookSubscribed: false,
    },
  });
  console.log(`✅ Social account: ${account.pageName}`);

  // Create bot with default delete/spam keywords
  const { DEFAULT_DELETE_PATTERNS, DEFAULT_SPAM_PATTERNS } = await import('../lib/moderation/keyword-detector');

  const bot = await prisma.bot.upsert({
    where: { id: 'demo-bot-001' },
    update: {},
    create: {
      id: 'demo-bot-001',
      tenantId: tenant.id,
      accountId: account.id,
      name: 'Bot Urbamares Facebook',
      isActive: false, // Off by default for safety in dev
      autoReply: true,
      deleteNegative: true,
      hideSpam: true,
      aiEnabled: true,
      replyTone: 'friendly',
      language: 'es',
      replyMaxChars: 250,
      systemInstructions: 'Nunca reveles fechas exactas de entrega. Siempre redirige preguntas de financiación a WhatsApp. Sé cálido y profesional.',
      deleteKeywords: DEFAULT_DELETE_PATTERNS,
      spamKeywords: DEFAULT_SPAM_PATTERNS,
    },
  });
  console.log(`✅ Bot: ${bot.name}`);

  // Create projects and their knowledge entries
  for (const projectData of DEMO_PROJECTS) {
    const project = await prisma.project.create({
      data: {
        botId: bot.id,
        name: projectData.name,
        detectionKeywords: projectData.detectionKeywords,
        isDefault: false,
      },
    });

    for (let i = 0; i < projectData.knowledge.length; i++) {
      const k = projectData.knowledge[i];
      await prisma.knowledgeEntry.create({
        data: {
          botId: bot.id,
          projectId: project.id,
          key: k.key,
          value: k.value,
          category: k.category,
          order: i,
        },
      });
    }
    console.log(`✅ Project: ${project.name} (${projectData.knowledge.length} entries)`);
  }

  // Create global knowledge entries
  for (let i = 0; i < GLOBAL_KNOWLEDGE.length; i++) {
    const k = GLOBAL_KNOWLEDGE[i];
    await prisma.knowledgeEntry.create({
      data: {
        botId: bot.id,
        key: k.key,
        value: k.value,
        category: k.category,
        order: i,
      },
    });
  }
  console.log(`✅ Global knowledge: ${GLOBAL_KNOWLEDGE.length} entries`);

  // Create sample comment logs
  const now = new Date();
  for (let i = 0; i < SAMPLE_COMMENTS.length; i++) {
    const sample = SAMPLE_COMMENTS[i];
    const action = SAMPLE_COMMENT_ACTIONS[i % SAMPLE_COMMENT_ACTIONS.length];
    const createdAt = new Date(now.getTime() - (i * 3_600_000)); // 1 hour apart

    await prisma.commentLog.create({
      data: {
        tenantId: tenant.id,
        botId: bot.id,
        platform: 'FACEBOOK',
        commentId: `demo-comment-${String(i).padStart(3, '0')}`,
        postId: `demo-post-${String(Math.floor(i / 3)).padStart(3, '0')}`,
        authorName: sample.author,
        authorId: `demo-user-${String(i).padStart(3, '0')}`,
        originalText: sample.text,
        action: action as 'REPLIED' | 'DELETED' | 'HIDDEN' | 'IGNORED' | 'MANUAL_REPLY' | 'MANUAL_DELETE' | 'ERROR',
        aiReply: sample.reply,
        repliedAt: sample.reply ? createdAt : null,
        processingMs: Math.floor(Math.random() * 2000) + 300,
        createdAt,
      },
    });
  }
  console.log(`✅ Sample comments: ${SAMPLE_COMMENTS.length} logs`);

  console.log('\n🎉 Seed complete!');
  console.log(`   Tenant ID: ${tenant.id}`);
  console.log(`   Bot ID:    ${bot.id}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
