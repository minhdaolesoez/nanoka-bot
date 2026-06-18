import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import canvas from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';

const { createCanvas, loadImage } = canvas;

const WIDTH = 420;
const HEIGHT = 250;
const FRAMES = 12;
const TARGET_SIZE = 98;
const BONKER_SIZE = 92;

export const data = new SlashCommandBuilder()
    .setName('bonk')
    .setDescription('Create a bonk GIF')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('User to bonk')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('text')
            .setDescription('Impact text shown on the GIF')
            .setRequired(false)
            .setMaxLength(18)
    );

export async function execute(interaction) {
    const target = interaction.options.getUser('target');
    const label = (interaction.options.getString('text') || 'BONK!').toUpperCase();

    try {
        await interaction.deferReply();

        const [targetAvatar, bonkerAvatar] = await Promise.all([
            loadAvatar(target),
            loadAvatar(interaction.user)
        ]);

        const gifBuffer = buildBonkGif(targetAvatar, bonkerAvatar, label);
        const attachment = new AttachmentBuilder(gifBuffer, { name: 'bonk.gif' });

        await interaction.editReply({
            content: `${target} got bonked by ${interaction.user}!`,
            files: [attachment]
        });
    } catch (error) {
        console.error('Failed to render /bonk gif:', error);
        const content = 'Failed to generate bonk GIF.';
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content });
            return;
        }
        await interaction.reply({ content, ephemeral: true });
    }
}

async function loadAvatar(user) {
    const url = user.displayAvatarURL({ extension: 'png', forceStatic: true, size: 256 });
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Avatar fetch failed (${response.status})`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return loadImage(bytes);
}

function buildBonkGif(targetAvatar, bonkerAvatar, impactText) {
    const canvasFrame = createCanvas(WIDTH, HEIGHT);
    const ctx = canvasFrame.getContext('2d');

    const encoder = new GIFEncoder(WIDTH, HEIGHT, 'neuquant', true, FRAMES);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(70);
    encoder.setQuality(10);

    for (let frame = 0; frame < FRAMES; frame++) {
        drawFrame(ctx, frame, targetAvatar, bonkerAvatar, impactText);
        encoder.addFrame(ctx);
    }

    encoder.finish();
    return encoder.out.getData();
}

function drawFrame(ctx, frame, targetAvatar, bonkerAvatar, impactText) {
    const t = frame / (FRAMES - 1);
    const impact = impactCurve(t);

    drawBackground(ctx);

    const targetX = 310 + Math.sin(frame * 2.4) * impact * 11;
    const targetY = 145 + Math.sin(frame * 1.8) * impact * 5;
    const targetSquashX = 1 + impact * 0.22;
    const targetSquashY = 1 - impact * 0.18;

    const bonkerX = 115;
    const bonkerY = 162;

    drawHammer(ctx, bonkerX, bonkerY, t);
    drawAvatar(ctx, targetAvatar, targetX, targetY, TARGET_SIZE, targetSquashX, targetSquashY);
    drawAvatar(ctx, bonkerAvatar, bonkerX, bonkerY, BONKER_SIZE, 1, 1);

    if (impact > 0.18) {
        const pop = 1 + impact * 0.25;
        ctx.save();
        ctx.translate(206, 58);
        ctx.rotate(-0.08 + Math.sin(frame * 0.7) * 0.03);
        ctx.scale(pop, pop);
        ctx.fillStyle = '#fff1a8';
        ctx.strokeStyle = '#1f1300';
        ctx.lineWidth = 5;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 34px Arial';
        ctx.strokeText(impactText, 0, 0);
        ctx.fillText(impactText, 0, 0);
        ctx.restore();
    }
}

function drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, '#5db2ff');
    gradient.addColorStop(1, '#0f5a93');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#123e63';
    ctx.fillRect(0, 196, WIDTH, 54);
}

function drawAvatar(ctx, image, x, y, size, scaleX, scaleY) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawHammer(ctx, baseX, baseY, t) {
    const eased = easeInOut(Math.min(t / 0.58, 1));
    const angle = -1.1 + eased * 1.35;

    ctx.save();
    ctx.translate(baseX - 10, baseY - 34);
    ctx.rotate(angle);

    ctx.fillStyle = '#8a4d2b';
    ctx.fillRect(0, -5, 118, 10);

    ctx.fillStyle = '#cdcdcd';
    ctx.fillRect(105, -18, 38, 36);
    ctx.fillStyle = '#868686';
    ctx.fillRect(105, -18, 8, 36);

    ctx.restore();
}

function easeInOut(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function impactCurve(t) {
    if (t < 0.38 || t > 0.86) {
        return 0;
    }
    const normalized = (t - 0.38) / 0.48;
    return Math.sin(normalized * Math.PI);
}
