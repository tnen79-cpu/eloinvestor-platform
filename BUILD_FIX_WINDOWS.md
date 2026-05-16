# حل مشكلة npm install / node_modules / ETIMEDOUT

هذه النسخة لا تحتوي على node_modules وهذا طبيعي. يجب تثبيت الحزم محلياً أو على Vercel.

## تشغيل محلي على Windows PowerShell

افتح PowerShell داخل مجلد المشروع ثم نفذ:

```powershell
npm config delete proxy
npm config delete https-proxy
npm config set registry https://registry.npmjs.org/
npm cache clean --force
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install --fetch-timeout=600000 --fetch-retries=5
npm run build
npm run dev
```

إذا أردت الالتزام بالـ package-lock الموجود بدل إعادة توليده:

```powershell
npm ci --fetch-timeout=600000 --fetch-retries=5
npm run build
```

## إعداد Vercel

Install Command:

```bash
npm install --fetch-timeout=600000 --fetch-retries=5
```

Build Command:

```bash
npm run build
```

Output Framework: Next.js

## ملاحظة

إذا استمر ETIMEDOUT فهذا من الشبكة أو DNS أو حجب npm، وليس من ملفات التصميم. جرّب شبكة ثانية أو VPN مختلف أو DNS مثل 1.1.1.1 / 8.8.8.8.
