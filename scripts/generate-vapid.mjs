import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("将以下值配置到 Vercel 环境变量（或本地 .env.local）：\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
